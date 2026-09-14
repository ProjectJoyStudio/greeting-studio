// Shape of the downloadable offline Memory Book package.
//
// Both the laboratory script (scripts/export-offline-book.ts) and the
// customer-facing download use these rules, so the package a customer receives
// is built exactly like the tested stable package.

import {
  clampFrame,
  clampSlot,
  clampTextDesign,
  clampVideoFrame,
  readPlacedDecorations,
  type MemoryBookPage,
  type MemoryBookPageContent,
} from "./pages";

export type Row = Record<string, unknown>;

/** Folder inside the package that holds every file of the book. */
export const OFFLINE_ASSET_FOLDER = "book-files";

/** The one neutral name every downloaded package carries. */
export const OFFLINE_PACKAGE_NAME = "Project Joy — Книга воспоминаний и поздравлений";

/** The page the customer opens after extracting the package. */
export const OFFLINE_ENTRY_FILE = "Открыть книгу.html";

export function offlineText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** One stored file that has to travel inside the package. */
export interface OfflinePackageFile {
  /** File name inside the book-files folder. */
  name: string;
  /** Temporary read link used only while the package is being built. */
  url: string;
}

/**
 * A small file that must be readable as data by the viewer (SVG decorations
 * used as CSS masks). Its place in the data is marked by a token.
 */
export interface OfflineInlineFile {
  token: string;
  url: string;
  mime: string;
}

/** Everything the browser needs to assemble the package. */
export interface OfflinePackagePlan {
  /** The book data as JSON, already pointing at local file names. */
  dataJson: string;
  files: OfflinePackageFile[];
  inline: OfflineInlineFile[];
}

/** Turns one stored page row into the page the viewer understands. */
export function offlineRowToPage(row: Row): MemoryBookPage {
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
    text: offlineText(row.text_content),
    textDesign: clampTextDesign(row.text_design ?? null),
    videoMaterialId: typeof row.video_material_id === "string" ? row.video_material_id : null,
    videoFrame: clampVideoFrame((row.video_frame ?? null) as Record<string, number> | null),
    decorations: readPlacedDecorations(row.decorations),
  };
}

/** The saved leaf order, completed with any leaf that is not listed yet. */
export function offlineLeafOrder(stored: unknown, leaves: number): number[] {
  const seen = new Set<number>();
  const order: number[] = [];
  for (const raw of Array.isArray(stored) ? stored : []) {
    const n = Math.round(Number(raw));
    if (n >= 1 && n <= leaves && !seen.has(n)) {
      seen.add(n);
      order.push(n);
    }
  }
  for (let n = 1; n <= leaves; n += 1) if (!seen.has(n)) order.push(n);
  return order;
}

/** The page the customer double-clicks after extracting the package. */
export function offlineEntryHtml(): string {
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Project Joy — Книга воспоминаний и поздравлений</title>
    <link rel="stylesheet" href="${OFFLINE_ASSET_FOLDER}/fonts.css" />
    <link rel="stylesheet" href="${OFFLINE_ASSET_FOLDER}/book.css" />
  </head>
  <body>
    <div id="joy-book"></div>
    <script src="${OFFLINE_ASSET_FOLDER}/book-data.js"></script>
    <script src="${OFFLINE_ASSET_FOLDER}/book.js"></script>
  </body>
</html>
`;
}
