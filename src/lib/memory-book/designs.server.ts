// Server-only rendering of Memory Book cover and leaf designs.
//
// The engine is NEVER chosen here: the administrator's Generator Control
// Centre decides which engine serves "Memory Book Cover" and "Memory Book
// Leaf Design", in which order. This module only executes what the routing
// layer returns and downloads the finished picture.

import type { MemoryBookStage } from "./designs";

/** Runware engines approved for the Memory Book, key → model address. */
const RUNWARE_ENGINES: Record<string, string> = {
  rw_flux2_pro: "bfl:5@1",
  rw_seedream5_pro: "bytedance:seedream@5.0-pro",
  rw_nano_banana_pro: "google:4@2",
  rw_recraft_v4_pro: "recraft:v4-pro@0",
};

/** Replicate engines approved for the Memory Book, key → model path. */
const REPLICATE_ENGINES: Record<string, string> = {
  flux2_pro: "black-forest-labs/flux-2-pro",
  rp_seedream5_pro: "bytedance/seedream-5-pro",
  rp_nano_banana_pro: "google/nano-banana-pro",
  rp_recraft_v4_pro: "recraft-ai/recraft-v4-pro",
};

const ALL_KEYS = [...Object.keys(RUNWARE_ENGINES), ...Object.keys(REPLICATE_ENGINES)];

const NO_TEXT_RULE =
  "Clean decorative design only. The picture must contain absolutely no text: " +
  "no lettering, no words, no letters, no numbers, no title, no names, no dates, " +
  "no greeting, no poem, no caption, no watermark and no signature.";

const NEGATIVE = "text, letters, words, numbers, title, caption, watermark, signature, logo";

/** Cover-only rule: the artwork itself, never a photographed or mocked-up book. */
const COVER_FLAT_RULE =
  "This is the flat front cover artwork itself, designed as a full-bleed graphic: " +
  "front-facing, straight-on view, filling the entire image edge to edge. " +
  "It is not a photograph or mockup of a physical book: no book object, no book on a " +
  "table or any surface, no multiple books, no room or background scene, no hands, " +
  "no surrounding props, no perspective or angled view, no visible book thickness, " +
  "edges, spine or pages, no frame or border around the design.";

const COVER_NEGATIVE =
  `${NEGATIVE}, book mockup, physical book, closed book, open book, book on table, ` +
  "stack of books, book spine, book pages, book thickness, 3d book render, perspective view, " +
  "hands holding book, room scene, table, background scene, product photo, frame, border";

const ASPECT: Record<MemoryBookStage, string> = { cover: "3:4", leaf: "3:4" };
const SIZE = { width: 1024, height: 1360 };

export interface RenderedDesign {
  bytes: Uint8Array;
  contentType: string;
  fileExtension: string;
}

function functionIdOf(stage: MemoryBookStage): string {
  return stage === "cover" ? "memory_book.cover" : "memory_book.leaf_design";
}

/**
 * Turns what the person wrote in any of the six languages into the final
 * English prompt. The shared Project Joy translation layer does the language
 * work; only the internal design rules are added on top.
 */
async function buildPrompt(description: string, stage: MemoryBookStage): Promise<string> {
  const clean = description.trim().slice(0, 900);
  const { toEnglishImagePrompt } = await import("@/lib/greeting-card/prompt-translate.server");
  const english = await toEnglishImagePrompt(clean).catch(() => clean);
  const rules = stage === "cover" ? `${COVER_FLAT_RULE}\n\n${NO_TEXT_RULE}` : NO_TEXT_RULE;
  return `${english}\n\n${rules}`;
}

/**
 * Runware image models used by the Memory Book do not accept a separate
 * negative prompt, so the same exclusions travel inside the English prompt.
 */
function promptWithExclusions(prompt: string, stage: MemoryBookStage): string {
  const avoid = stage === "cover" ? COVER_NEGATIVE : NEGATIVE;
  return `${prompt}\n\nDo not include any of the following in the picture: ${avoid}.`;
}


function pickUrl(output: unknown): string | null {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    const first = output.find((v) => typeof v === "string");
    return typeof first === "string" ? first : null;
  }
  if (output && typeof output === "object") {
    const record = output as Record<string, unknown>;
    for (const key of ["url", "image", "output"]) {
      const value = record[key];
      if (typeof value === "string") return value;
    }
  }
  return null;
}

async function renderWithRunware(
  key: string,
  prompt: string,
  stage: MemoryBookStage,
): Promise<string> {
  const { runwareTasks } = await import("@/lib/runware/runware.server");
  const rows = await runwareTasks([
    {
      taskType: "imageInference",
      taskUUID: crypto.randomUUID(),
      model: RUNWARE_ENGINES[key],
      positivePrompt: promptWithExclusions(prompt, stage),
      width: SIZE.width,

      height: SIZE.height,
      numberResults: 1,
      outputType: "URL",
      outputFormat: "JPG",
    },
  ]);
  const url = typeof rows[0]?.["imageURL"] === "string" ? (rows[0]!["imageURL"] as string) : null;
  if (!url) throw new Error("The engine returned no picture.");
  return url;
}

async function renderWithReplicate(
  key: string,
  prompt: string,
  stage: MemoryBookStage,
): Promise<string> {
  const { runReplicate } = await import("@/lib/replicate/run.server");
  const output = await runReplicate(REPLICATE_ENGINES[key]!, {
    prompt,
    aspect_ratio: ASPECT[stage],
    output_format: "jpg",
  });
  const url = pickUrl(output);
  if (!url) throw new Error("The engine returned no picture.");
  return url;
}

async function download(url: string): Promise<RenderedDesign> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`The picture could not be downloaded (${res.status}).`);
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const fileExtension = contentType.includes("png")
    ? "png"
    : contentType.includes("webp")
      ? "webp"
      : "jpg";
  return { bytes: new Uint8Array(await res.arrayBuffer()), contentType, fileExtension };
}

/**
 * Creates ONE design picture through the engine the administrator configured
 * for this function. Only when that engine fails technically does the
 * configured reserve follow — one variant is always one request per engine.
 */
export async function renderMemoryBookDesign(
  stage: MemoryBookStage,
  description: string,
): Promise<RenderedDesign> {
  const { generatorOrder, withGeneratorSlot } = await import(
    "@/lib/admin/generators/runtime.server"
  );
  const order = await generatorOrder(functionIdOf(stage), ALL_KEYS).catch(() => []);
  if (!order.length) {
    throw new Error("no_generator");
  }

  const prompt = await buildPrompt(description, stage);
  let lastError: Error | null = null;

  for (const key of order) {
    try {
      const url = await withGeneratorSlot(key, () =>
        RUNWARE_ENGINES[key]
          ? renderWithRunware(key, prompt, stage)
          : renderWithReplicate(key, prompt, stage),
      );
      return await download(url);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError ?? new Error("generation_failed");
}
