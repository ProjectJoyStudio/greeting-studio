// Browser-only repair of Own Voice profiles created before Project Joy kept a
// studio-readable WAV rendition beside the original recording.
//
// Nobody is asked to record their voice again: the stored original recording is
// read once, a WAV rendition of that same recording is prepared, and it is kept
// next to it in the very same Own Voice profile. Renditions that already exist
// are never touched, and a failure simply leaves the profile as it was.

import { mergeInOrder } from "./mixdown";

let running = false;
let done = false;

/**
 * Prepares the missing WAV rendition of every Own Voice recording of the
 * signed-in person. Safe to call repeatedly: it runs at most once per visit
 * and skips everything that is already in order.
 */
export async function repairOwnVoiceRenditions(
  list: () => Promise<{ items: { voiceId: string; index: number; url: string; mime: string }[] }>,
  save: (data: {
    data: { voiceId: string; index: number; base64: string; mimeType: string };
  }) => Promise<{ saved: boolean }>,
): Promise<{ eligible: number; repaired: number; failed: number }> {
  if (running || done) return { eligible: 0, repaired: 0, failed: 0 };
  running = true;
  let repaired = 0;
  let failed = 0;
  let eligible = 0;
  try {
    const { items } = await list();
    eligible = items.length;
    for (const item of items) {
      try {
        const wav = await mergeInOrder([{ url: item.url, mimeType: item.mime }], {
          compress: false,
        });
        if (!wav.base64) throw new Error("rendition_empty");
        const res = await save({
          data: {
            voiceId: item.voiceId,
            index: item.index,
            base64: wav.base64,
            mimeType: wav.mimeType,
          },
        });
        if (res.saved) repaired += 1;
      } catch {
        failed += 1;
      }
    }
    done = true;
  } catch {
    // The repair is best-effort; nothing is changed when it cannot run.
  } finally {
    running = false;
  }
  return { eligible, repaired, failed };
}
