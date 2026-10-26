// Builds the downloadable offline Memory Book package in the customer's
// browser, so no package file is ever kept on Project Joy.
//
// The viewer, its stylesheet and the fonts come from the site itself; every
// picture, video and piece of music comes through the temporary read links of
// the plan. Nothing here changes the book.

import { downloadZip } from "client-zip";

import {
  OFFLINE_ASSET_FOLDER,
  OFFLINE_ENTRY_FILE,
  OFFLINE_PACKAGE_NAME,
  offlineEntryHtml,
  type OfflinePackagePlan,
} from "./offline-package";
import type { OfflineSaveTarget } from "./offline-save";

/** One file written into the archive. */
interface ZipEntry {
  name: string;
  input: string | Response;
}

/** Files of the stable offline viewer, served by the site itself. */
const VIEWER_FILES = ["book.js", "book.css"] as const;

export type OfflineExportStage = "preparing" | "loading" | "building" | "saving";

export type OfflineExportCategory =
  | "plan_failed"
  | "missing_asset"
  | "asset_http"
  | "asset_network"
  | "viewer_files"
  | "save_failed";

/** A failure with safe diagnostics only: never a link, token or storage key. */
export class OfflineExportError extends Error {
  constructor(
    readonly stage: OfflineExportStage,
    readonly category: OfflineExportCategory,
    readonly detail: { status?: number; asset?: string } = {},
  ) {
    super(`${stage}:${category}${detail.status ? `:${detail.status}` : ""}`);
  }
}

export interface OfflineZipProgress {
  stage: OfflineExportStage;
  /** Files already added to the package. */
  done: number;
  /** Files the package will contain in total. */
  total: number;
}

const RETRY_DELAYS = [600, 1800];

/**
 * Reads one file, retrying short provider or network hiccups. A definite
 * refusal (404/403) is reported as a missing asset at once: nothing is ever
 * silently left out of the book.
 */
async function fetchRequired(url: string, asset: string, viewer = false): Promise<Response> {
  for (let attempt = 0; ; attempt += 1) {
    let res: Response | null = null;
    try {
      res = await fetch(url, { cache: "no-store" });
    } catch {
      res = null;
    }
    if (res?.ok && res.body) return res;
    const status = res?.status;
    const retryable = !res || status === 408 || status === 429 || (status ?? 0) >= 500;
    if (retryable && attempt < RETRY_DELAYS.length) {
      await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
      continue;
    }
    if (viewer) throw new OfflineExportError("loading", "viewer_files", { status, asset });
    if (!res) throw new OfflineExportError("loading", "asset_network", { asset });
    throw new OfflineExportError(
      "loading",
      status === 403 || status === 404 ? "missing_asset" : "asset_http",
      { status, asset },
    );
  }
}

async function toDataUrl(url: string, mime: string, asset: string): Promise<string> {
  const bytes = new Uint8Array(await (await fetchRequired(url, asset)).arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  return `data:${mime};base64,${btoa(binary)}`;
}

/** The font files the package carries, read from the local fonts stylesheet. */
async function fontEntries(base: string): Promise<ZipEntry[]> {
  const css = await (await fetchRequired(`${base}/fonts/fonts.css`, "fonts.css", true)).text();
  const names = [...new Set([...css.matchAll(/url\((font-\d+\.woff2)\)/g)].map((m) => m[1]!))];
  const out: ZipEntry[] = [{ name: `${OFFLINE_ASSET_FOLDER}/fonts.css`, input: css }];
  for (const name of names) {
    out.push({
      name: `${OFFLINE_ASSET_FOLDER}/${name}`,
      input: await fetchRequired(`${base}/fonts/${name}`, name, true),
    });
  }
  return out;
}

/**
 * Assembles the package and writes it to the save target chosen during the
 * click. Resolves only after the archive was fully produced and written (file
 * target) or handed to the browser's download (download target). On any
 * failure a partially written file is discarded by the browser.
 */
export async function saveOfflineBookPackage(
  plan: OfflinePackagePlan,
  target: Exclude<OfflineSaveTarget, { kind: "cancelled" }>,
  onProgress?: (progress: OfflineZipProgress) => void,
): Promise<void> {
  const base = `${window.location.origin}/offline`;
  const total = plan.files.length + VIEWER_FILES.length + 3;
  let done = 0;
  const report = (stage: OfflineExportStage) => onProgress?.({ stage, done, total });

  report("loading");
  // Decorations used as CSS masks must live inside the data itself.
  let dataJson = plan.dataJson;
  for (const item of plan.inline) {
    dataJson = dataJson.replaceAll(item.token, await toDataUrl(item.url, item.mime, item.asset));
  }
  const fonts = await fontEntries(base);
  done += 1;
  report("building");

  // The first failure inside the stream is kept, so the customer sees its
  // real stage and category rather than a generic stream error.
  let failure: unknown = null;
  async function* entries(): AsyncGenerator<ZipEntry> {
    try {
      yield { name: `${OFFLINE_PACKAGE_NAME}/${OFFLINE_ENTRY_FILE}`, input: offlineEntryHtml() };
      yield {
        name: `${OFFLINE_PACKAGE_NAME}/${OFFLINE_ASSET_FOLDER}/book-data.js`,
        input: `window.__JOY_BOOK__ = ${dataJson};\n`,
      };
      done += 1;
      for (const font of fonts) yield { ...font, name: `${OFFLINE_PACKAGE_NAME}/${font.name}` };
      for (const name of VIEWER_FILES) {
        const input = await fetchRequired(`${base}/${name}`, name, true);
        yield { name: `${OFFLINE_PACKAGE_NAME}/${OFFLINE_ASSET_FOLDER}/${name}`, input };
        done += 1;
        report("building");
      }
      for (const file of plan.files) {
        // Each media file is streamed straight into the archive.
        const input = await fetchRequired(file.url, file.asset);
        yield { name: `${OFFLINE_PACKAGE_NAME}/${OFFLINE_ASSET_FOLDER}/${file.name}`, input };
        done += 1;
        report("building");
      }
    } catch (error) {
      failure = error;
      throw error;
    }
  }

  const zipped = downloadZip(entries() as unknown as AsyncIterable<File>);
  const fail = (fallback: OfflineExportError) => {
    throw failure instanceof OfflineExportError ? failure : fallback;
  };

  if (target.kind === "file") {
    let writable: WritableStream<Uint8Array>;
    try {
      writable = await target.handle.createWritable();
    } catch {
      throw new OfflineExportError("saving", "save_failed");
    }
    try {
      // Streamed to disk: even a large book never has to fit in memory. On
      // error pipeTo aborts the writable, so no broken file is left behind.
      await zipped.body!.pipeTo(writable);
    } catch {
      fail(new OfflineExportError("saving", "save_failed"));
    }
    done = total;
    report("saving");
    return;
  }

  let blob: Blob;
  try {
    blob = await zipped.blob();
  } catch {
    return fail(new OfflineExportError("building", "save_failed"));
  }
  done = total;
  report("saving");
  const url = URL.createObjectURL(new Blob([blob], { type: "application/zip" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${OFFLINE_PACKAGE_NAME}.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
}
