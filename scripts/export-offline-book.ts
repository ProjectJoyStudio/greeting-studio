/**
 * Builds ONE downloadable, fully offline copy of an existing Memory Book.
 *
 * Run from the project root:  bun scripts/export-offline-book.ts <bookId>
 *
 * It only READS the book: nothing in the database or in storage is changed.
 * Every picture, video, decoration, piece of music and font is copied into the
 * package, and every address inside the exported data points at the local
 * folder, so the finished package needs no server and no internet.
 */
import { createClient } from "@supabase/supabase-js";
import { mkdir, rm, writeFile, copyFile, readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  clampFrame,
  clampSlot,
  clampTextDesign,
  clampVideoFrame,
  readPlacedDecorations,
  type MemoryBookPage,
  type MemoryBookPageContent,
} from "../src/lib/memory-book/pages";

type Row = Record<string, unknown>;

const bookId = process.argv[2];
if (!bookId) {
  console.error("Usage: bun scripts/export-offline-book.ts <bookId>");
  process.exit(1);
}

const OUT = "/tmp/offline-book";
const ASSETS = join(OUT, "book-files");
const FONT_CSS_FAMILIES =
  "family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=Caveat:wght@400;500;600;700&family=Bad+Script&family=Great+Vibes&family=Lobster&family=Marck+Script&family=Playfair:wght@400;500;600;700&display=swap";

const db = createClient(
  process.env["SUPABASE_URL"]!,
  process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
  { auth: { persistSession: false } },
);

const saved = new Map<string, string>();
let counter = 0;

/** Copies one stored file into the package and returns its local address. */
async function localCopy(bucket: string | null, path: string | null): Promise<string | null> {
  if (!bucket || !path) return null;
  const key = `${bucket}/${path}`;
  const known = saved.get(key);
  if (known) return known;
  const { data, error } = await db.storage.from(bucket).download(path);
  if (error || !data) {
    console.warn(`  ! could not read ${key}: ${error?.message ?? "missing"}`);
    return null;
  }
  const ext = path.includes(".") ? path.slice(path.lastIndexOf(".")) : "";
  const name = `${String(++counter).padStart(3, "0")}${ext}`;
  await writeFile(join(ASSETS, name), Buffer.from(await data.arrayBuffer()));
  const url = `book-files/${name}`;
  saved.set(key, url);
  console.log(`  + ${key} -> ${url}`);
  return url;
}

/** Small files that must be readable as data (CSS masks) travel inline. */
async function inlineCopy(bucket: string, path: string): Promise<string | null> {
  const { data, error } = await db.storage.from(bucket).download(path);
  if (error || !data) return null;
  const bytes = Buffer.from(await data.arrayBuffer());
  const mime = path.endsWith(".svg") ? "image/svg+xml" : "image/png";
  console.log(`  + ${bucket}/${path} -> inside the book data`);
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

function text(v: unknown) {
  return typeof v === "string" ? v : "";
}

function rowToPage(row: Row): MemoryBookPage {
  return {
    pageIndex: Number(row.page_index ?? 0),
    content: String(row.content_type ?? "empty") as MemoryBookPageContent,
    layout: typeof row.layout === "string" ? row.layout : null,
    slots: Array.isArray(row.slots)
      ? row.slots.map((raw) => {
          const s = (raw ?? {}) as Row;
          return clampSlot({
            materialId: typeof s.materialId === "string" ? s.materialId : null,
            offsetX: Number(s.offsetX ?? 0),
            offsetY: Number(s.offsetY ?? 0),
            scale: Number(s.scale ?? 1),
          });
        })
      : [],
    frame: clampFrame((row.frame ?? null) as Record<string, number> | null),
    text: text(row.text_content),
    textDesign: clampTextDesign(row.text_design ?? null),
    videoMaterialId: typeof row.video_material_id === "string" ? row.video_material_id : null,
    videoFrame: clampVideoFrame((row.video_frame ?? null) as Record<string, number> | null),
    decorations: readPlacedDecorations(row.decorations),
  };
}

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(ASSETS, { recursive: true });

  const { data: bookRow } = await db
    .from("memory_book_projects")
    .select("*")
    .eq("id", bookId)
    .maybeSingle();
  if (!bookRow) throw new Error("book not found");
  const book = bookRow as Row;
  const userId = String(book.user_id);
  const internalPages = Number(book.internal_pages ?? 0);
  const leaves = Number(book.leaves ?? 0) || Math.ceil(internalPages / 2);

  console.log(`Book ${bookId}: ${internalPages} internal pages, ${leaves} leaves`);

  // ---- pages (front cover 0, internal 1..n, back cover -1) ----
  const { data: pageRows } = await db
    .from("memory_book_pages")
    .select("*")
    .eq("book_id", bookId)
    .eq("user_id", userId)
    .order("page_index", { ascending: true });

  const pages: Record<number, MemoryBookPage> = {};
  for (const raw of (pageRows ?? []) as Row[]) {
    const index = Number(raw.page_index);
    if (index < -1 || index > internalPages) continue;
    const page = rowToPage(raw);
    const bg = await localCopy(text(raw.background_bucket) || null, text(raw.background_path) || null);
    if (bg) page.backgroundUrl = bg;
    pages[index] = page;
  }

  // ---- photos and videos ----
  const { data: matRows } = await db
    .from("memory_book_materials")
    .select("id, kind, bucket, path, file_name, size_bytes, duration_seconds, created_at")
    .eq("book_id", bookId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  const materials = [];
  for (const raw of (matRows ?? []) as Row[]) {
    const url = await localCopy(text(raw.bucket), text(raw.path));
    if (!url) continue;
    materials.push({
      id: String(raw.id),
      kind: raw.kind === "video" ? "video" : "photo",
      url,
      fileName: text(raw.file_name),
      durationSeconds: raw.duration_seconds === null ? null : Number(raw.duration_seconds),
      sizeBytes: raw.size_bytes === null ? null : Number(raw.size_bytes),
      createdAt: text(raw.created_at),
    });
  }

  // ---- decorations actually placed on the pages ----
  const usedDecorations = new Set<string>();
  for (const page of Object.values(pages))
    for (const item of page.decorations) usedDecorations.add(item.decorationId);

  const library = [];
  if (usedDecorations.size) {
    const { data: decRows } = await db
      .from("memory_book_decorations")
      .select("id, name, category, bucket, path, file_type, recolorable, enabled, sort_order, created_at")
      .in("id", [...usedDecorations]);
    for (const raw of (decRows ?? []) as Row[]) {
      library.push({
        id: String(raw.id),
        name: text(raw.name),
        category: text(raw.category),
        // SVG decorations are used as CSS masks, which a browser refuses to
        // read from a local folder, so they travel inside the data itself.
        url:
          raw.file_type === "svg"
            ? await inlineCopy(text(raw.bucket), text(raw.path))
            : await localCopy(text(raw.bucket), text(raw.path)),
        fileType: raw.file_type === "svg" ? "svg" : "png",
        recolorable: raw.recolorable === true,
        enabled: raw.enabled !== false,
        sortOrder: Number(raw.sort_order ?? 0),
        path: text(raw.path),
        createdAt: text(raw.created_at),
      });
    }
  }

  // ---- cover / leaf backgrounds ----
  const { data: designRows } = await db
    .from("memory_book_designs")
    .select("id, stage, bucket, path")
    .eq("book_id", bookId);
  const designs = new Map<string, Row>();
  for (const raw of (designRows ?? []) as Row[]) designs.set(String(raw.id), raw);

  const pick = async (id: unknown) => {
    const row = typeof id === "string" ? designs.get(id) : null;
    return row ? await localCopy(text(row.bucket), text(row.path)) : null;
  };
  const coverUrl = await pick(book.selected_cover_id);
  const leafBackgroundUrl = await pick(book.selected_leaf_id);
  const backCoverUrl =
    book.back_cover_overridden === true
      ? ((await pick(book.back_cover_design_id)) ?? coverUrl)
      : coverUrl;

  // ---- background music ----
  let musicUrl: string | null = null;
  if (book.music_source === "library") {
    musicUrl = await localCopy(text(book.music_track_bucket), text(book.music_track_path));
  } else if (book.music_source === "created" && typeof book.music_variant_id === "string") {
    const { data: variant } = await db
      .from("memory_book_music_variants")
      .select("id, bucket, path")
      .eq("id", book.music_variant_id)
      .maybeSingle();
    if (variant) musicUrl = await localCopy(text((variant as Row).bucket), text((variant as Row).path));
  }

  // ---- leaf order, exactly as saved ----
  const base = Array.from({ length: leaves }, (_, i) => i + 1);
  const stored = Array.isArray(book.leaf_order) ? book.leaf_order : [];
  const seen = new Set<number>();
  const order: number[] = [];
  for (const raw of stored) {
    const n = Math.round(Number(raw));
    if (n >= 1 && n <= leaves && !seen.has(n)) {
      seen.add(n);
      order.push(n);
    }
  }
  for (const n of base) if (!seen.has(n)) order.push(n);

  const data = {
    pages,
    order,
    materials,
    library,
    coverUrl,
    backCoverUrl,
    leafBackgroundUrl,
    musicUrl,
    musicEnabled: book.music_enabled !== false,
    musicVolume: Number(book.music_volume ?? 0.35),
  };

  // ---- fonts, copied from the web font service into the package ----
  const cssRes = await fetch(`https://fonts.googleapis.com/css2?${FONT_CSS_FAMILIES}`, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    },
  });
  let fontCss = await cssRes.text();
  const fontUrls = [...new Set([...fontCss.matchAll(/https:\/\/[^)]+\.woff2/g)].map((m) => m[0]!))];
  let fontIndex = 0;
  for (const url of fontUrls) {
    const name = `font-${String(++fontIndex).padStart(3, "0")}.woff2`;
    const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
    await writeFile(join(ASSETS, name), bytes);
    fontCss = fontCss.replaceAll(url, name); // fonts.css lives beside the font files
  }
  console.log(`  + ${fontUrls.length} font files`);
  await writeFile(join(ASSETS, "fonts.css"), fontCss);

  // ---- the viewer itself ----
  await copyFile("dist-offline/book.js", join(ASSETS, "book.js"));
  await copyFile("dist-offline/book.css", join(ASSETS, "book.css"));
  await writeFile(
    join(ASSETS, "book-data.js"),
    `window.__JOY_BOOK__ = ${JSON.stringify(data)};\n`,
  );

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Your Memory Book</title>
    <link rel="stylesheet" href="book-files/fonts.css" />
    <link rel="stylesheet" href="book-files/book.css" />
  </head>
  <body>
    <div id="joy-book"></div>
    <script src="book-files/book-data.js"></script>
    <script src="book-files/book.js"></script>
  </body>
</html>
`;
  await writeFile(join(OUT, "Open Book.html"), html);

  console.log(
    `\nPackage ready in ${OUT} (data size ${(
      (await readFile(join(ASSETS, "book-data.js"))).length / 1024
    ).toFixed(1)} kB)`,
  );
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
