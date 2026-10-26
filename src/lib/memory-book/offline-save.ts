// Chooses where the offline Memory Book ZIP will be saved.
//
// Browsers only open the "Save as" dialog while they are still handling the
// customer's click. `requestOfflineSaveTarget` must therefore be the FIRST
// thing the click handler calls, before any `await`: it asks for the dialog
// synchronously and only then lets the slower preparation start.
//
// This module is imported statically on purpose — a dynamic import before the
// dialog would itself be an `await` and cost the click.

export interface WritableTarget {
  createWritable: () => Promise<WritableStream<Uint8Array>>;
}

export type OfflineSaveTarget =
  /** The customer chose a file on disk; the archive is streamed into it. */
  | { kind: "file"; handle: WritableTarget }
  /** No usable dialog in this browser/frame; a normal download is used. */
  | { kind: "download"; reason: string }
  /** The customer closed the dialog. Nothing is prepared or changed. */
  | { kind: "cancelled" };

type Picker = (options: unknown) => Promise<WritableTarget>;

export function requestOfflineSaveTarget(fileName: string): Promise<OfflineSaveTarget> {
  const picker =
    typeof window === "undefined"
      ? undefined
      : (window as unknown as { showSaveFilePicker?: Picker }).showSaveFilePicker;
  if (typeof picker !== "function") {
    return Promise.resolve({ kind: "download", reason: "picker_unavailable" });
  }
  let pending: Promise<WritableTarget>;
  try {
    // Called synchronously, inside the click.
    pending = picker.call(window, {
      suggestedName: fileName,
      types: [{ description: "ZIP", accept: { "application/zip": [".zip"] } }],
    });
  } catch (error) {
    return Promise.resolve({ kind: "download", reason: errorName(error) });
  }
  return pending.then(
    (handle): OfflineSaveTarget => ({ kind: "file", handle }),
    (error): OfflineSaveTarget =>
      errorName(error) === "AbortError"
        ? { kind: "cancelled" }
        : // e.g. SecurityError inside an embedded preview frame: fall back.
          { kind: "download", reason: errorName(error) },
  );
}

function errorName(error: unknown): string {
  return error && typeof error === "object" && "name" in error
    ? String((error as { name: unknown }).name)
    : "unknown";
}
