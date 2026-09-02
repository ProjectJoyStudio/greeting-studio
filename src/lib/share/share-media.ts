// ---------------------------------------------------------------------------
// Sharing a finished Project Joy item hands the real media file to the device
// share sheet. Sharing is never destructive: nothing is delivered, closed or
// deleted because a share sheet was opened, and every failure keeps the work.
// ---------------------------------------------------------------------------

export type ShareMediaResult =
  /** The file reached the system share flow (not proof of delivery). */
  | "shared"
  /** The person dismissed the share sheet. */
  | "cancelled"
  /** This browser or device cannot share files at all. */
  | "unsupported"
  /** The file could not be fetched, prepared or handed over. */
  | "failed";

type NavigatorWithShare = Navigator & {
  canShare?: (data: ShareData) => boolean;
};

/** True when the browser can hand real files to the system share sheet. */
export function canShareFiles(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as NavigatorWithShare;
  if (typeof nav.share !== "function" || typeof nav.canShare !== "function") return false;
  try {
    const probe = new File([new Uint8Array([0])], "probe.txt", { type: "text/plain" });
    return nav.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/** Loads the already finished media and checks it is a real, non-empty file. */
export async function fetchShareFile(
  url: string,
  filename: string,
  fallbackType: string,
): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("media_unavailable");
  const blob = await res.blob();
  if (!blob.size) throw new Error("media_empty");
  return new File([blob], filename, { type: blob.type || fallbackType });
}

/**
 * Shares the existing final media file. The media is never regenerated and no
 * credit is ever touched; a cancelled or failed share simply reports back.
 */
export async function shareMediaFile(input: {
  url: string;
  filename: string;
  mimeType: string;
  title?: string;
  text?: string;
  /** Already prepared file, when the caller holds it in memory. */
  file?: File;
}): Promise<ShareMediaResult> {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return "unsupported";
  }
  const nav = navigator as NavigatorWithShare;
  let file: File;
  try {
    file = input.file ?? (await fetchShareFile(input.url, input.filename, input.mimeType));
  } catch {
    return "failed";
  }
  const data: ShareData = { files: [file] };
  if (input.title) data.title = input.title;
  if (input.text) data.text = input.text;
  if (typeof nav.canShare === "function" && !nav.canShare(data)) return "unsupported";
  try {
    await nav.share(data);
    return "shared";
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
    return "failed";
  }
}

/** A safe file name for the finished item. */
export function shareFileName(title: string | null | undefined, extension: string): string {
  const base = (title || "project-joy").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "");
  return `${base || "project-joy"}.${extension}`;
}
