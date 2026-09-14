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

/** One file written into the archive. */
interface ZipEntry {
  name: string;
  input: string | Response;
}

/** Files of the stable offline viewer, served by the site itself. */
const VIEWER_FILES = ["book.js", "book.css"] as const;

async function fetchOk(url: string): Promise<Response> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`download_failed:${url}`);
  return res;
}

async function toDataUrl(url: string, mime: string): Promise<string> {
  const bytes = new Uint8Array(await (await fetchOk(url)).arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  return `data:${mime};base64,${btoa(binary)}`;
}

/** The font files the package carries, read from the local fonts stylesheet. */
async function fontEntries(base: string): Promise<ZipEntry[]> {
  const css = await (await fetchOk(`${base}/fonts/fonts.css`)).text();
  const names = [...new Set([...css.matchAll(/url\((font-\d+\.woff2)\)/g)].map((m) => m[1]!))];
  const out: ZipEntry[] = [
    { name: `${OFFLINE_ASSET_FOLDER}/fonts.css`, input: css },
  ];
  for (const name of names) {
    out.push({
      name: `${OFFLINE_ASSET_FOLDER}/${name}`,
      input: await fetchOk(`${base}/fonts/${name}`),
    });
  }
  return out;
}

export interface OfflineZipProgress {
  /** Files already added to the package. */
  done: number;
  /** Files the package will contain in total. */
  total: number;
}

/**
 * Assembles the package and hands it to the customer as ONE file. The download
 * only starts once the archive has been produced without error.
 */
export async function downloadOfflineBookPackage(
  plan: OfflinePackagePlan,
  onProgress?: (progress: OfflineZipProgress) => void,
): Promise<void> {
  const base = `${window.location.origin}/offline`;

  // Decorations used as CSS masks must live inside the data itself.
  let dataJson = plan.dataJson;
  for (const item of plan.inline) {
    dataJson = dataJson.replaceAll(item.token, await toDataUrl(item.url, item.mime));
  }

  const fonts = await fontEntries(base);
  const total = plan.files.length + fonts.length + VIEWER_FILES.length + 2;
  let done = 0;
  const step = () => onProgress?.({ done: ++done, total });

  async function* entries(): AsyncGenerator<ZipEntry> {
    yield { name: `${OFFLINE_PACKAGE_NAME}/${OFFLINE_ENTRY_FILE}`, input: offlineEntryHtml() };
    step();
    yield {
      name: `${OFFLINE_PACKAGE_NAME}/${OFFLINE_ASSET_FOLDER}/book-data.js`,
      input: `window.__JOY_BOOK__ = ${dataJson};\n`,
    };
    step();
    for (const font of fonts) {
      yield { ...font, name: `${OFFLINE_PACKAGE_NAME}/${font.name}` };
      step();
    }
    for (const name of VIEWER_FILES) {
      yield {
        name: `${OFFLINE_PACKAGE_NAME}/${OFFLINE_ASSET_FOLDER}/${name}`,
        input: await fetchOk(`${base}/${name}`),
      };
      step();
    }
    for (const file of plan.files) {
      yield {
        name: `${OFFLINE_PACKAGE_NAME}/${OFFLINE_ASSET_FOLDER}/${file.name}`,
        input: await fetchOk(file.url),
      };
      step();
    }
  }

  const fileName = `${OFFLINE_PACKAGE_NAME}.zip`;
  const zipped = downloadZip(entries() as unknown as AsyncIterable<File>);

  // Where the browser allows it, the archive is written straight to disk, so
  // even a very large book never has to fit in memory.
  const picker = (
    window as unknown as {
      showSaveFilePicker?: (options: unknown) => Promise<{
        createWritable: () => Promise<WritableStream>;
      }>;
    }
  ).showSaveFilePicker;

  if (picker && zipped.body) {
    let handle: { createWritable: () => Promise<WritableStream> } | null = null;
    try {
      handle = await picker({
        suggestedName: fileName,
        types: [{ description: "ZIP", accept: { "application/zip": [".zip"] } }],
      });
    } catch {
      return; // The customer closed the save dialog: nothing was changed.
    }
    await zipped.body.pipeTo(await handle.createWritable());
    return;
  }

  const blob = await zipped.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
