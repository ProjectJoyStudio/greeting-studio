// ---------------------------------------------------------------------------
// Joins the manually chosen pieces of ONE source video into a single prepared
// video, entirely inside the browser. Every piece keeps its own original
// sound, and the picture and the sound fade softly into each other between two
// pieces. Nothing is generated, nothing is added, nothing is sent anywhere.
// ---------------------------------------------------------------------------

import {
  MEMORY_BOOK_FADE_SECONDS,
  fragmentsLength,
  type MemoryBookVideoFragment,
} from "./video-prep";

const MIME_CANDIDATES = [
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4;codecs=h264,aac",
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

function pickMime(): string {
  if (typeof MediaRecorder === "undefined") throw new Error("recording_unsupported");
  for (const mime of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  throw new Error("recording_unsupported");
}

function loadVideo(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const el = document.createElement("video");
    el.crossOrigin = "anonymous";
    el.playsInline = true;
    el.preload = "auto";
    el.onloadeddata = () => resolve(el);
    el.onerror = () => reject(new Error("video_load_failed"));
    el.src = url;
  });
}

function seek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      video.removeEventListener("seeked", done);
      resolve();
    };
    video.addEventListener("seeked", done);
    video.currentTime = time;
  });
}

/** Reads the real length of a finished file, also for browser recordings. */
export function readBlobDuration(blob: Blob): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const el = document.createElement("video");
    el.preload = "metadata";
    const finish = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    el.onloadedmetadata = () => {
      if (Number.isFinite(el.duration) && el.duration > 0) {
        finish(el.duration);
        return;
      }
      // Some recordings only report their length after seeking to the end.
      el.onseeked = () => finish(Number.isFinite(el.duration) ? el.duration : null);
      el.currentTime = 1e6;
    };
    el.onerror = () => finish(null);
    el.src = url;
  });
}

export interface PreparedVideo {
  blob: Blob;
  mime: string;
  extension: string;
  /** Real length of the produced file, in seconds. */
  seconds: number;
}

/**
 * Plays every chosen piece once, paints it on a surface and records the
 * result together with the original sound of that piece. Pieces may come from
 * several source videos; `sourceUrls` maps a source id to its address.
 */
export async function joinVideoFragments(
  sourceUrl: string,
  fragments: MemoryBookVideoFragment[],
  onProgress?: (ratio: number) => void,
  sourceUrls?: Record<string, string>,
): Promise<PreparedVideo> {
  if (fragments.length === 0) throw new Error("no_fragments");
  const mime = pickMime();
  const total = fragmentsLength(fragments);

  const audio = new AudioContext();
  if (audio.state === "suspended") await audio.resume();
  const destination = audio.createMediaStreamDestination();

  const opened = new Map<string, { video: HTMLVideoElement; gain: GainNode }>();
  const urlOf = (fragment: MemoryBookVideoFragment) =>
    (fragment.sourceId && sourceUrls?.[fragment.sourceId]) || sourceUrl;
  async function openSource(url: string) {
    const existing = opened.get(url);
    if (existing) return existing;
    const element = await loadVideo(url);
    const media = audio.createMediaElementSource(element);
    const gain = audio.createGain();
    media.connect(gain);
    gain.connect(destination);
    const entry = { video: element, gain };
    opened.set(url, entry);
    return entry;
  }

  const first = await openSource(urlOf(fragments[0]!));
  const width = first.video.videoWidth || 1280;
  const height = first.video.videoHeight || 720;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const surface = canvas.getContext("2d");
  if (!surface) throw new Error("canvas_unavailable");

  const stream = canvas.captureStream(30);
  for (const track of destination.stream.getAudioTracks()) stream.addTrack(track);

  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, { mimeType: mime });
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data);
  };
  const finished = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  let elapsed = 0;
  const cleanup = async () => {
    for (const entry of opened.values()) {
      try {
        entry.video.pause();
      } catch {
        /* already stopped */
      }
    }
    for (const track of stream.getTracks()) track.stop();
    await audio.close().catch(() => undefined);
  };

  try {
    for (let index = 0; index < fragments.length; index += 1) {
      const fragment = fragments[index]!;
      const length = Math.max(0, fragment.end - fragment.start);
      if (length <= 0) continue;
      const { video, gain } = await openSource(urlOf(fragment));
      const fade = Math.min(MEMORY_BOOK_FADE_SECONDS, length / 3);
      const fadesIn = index > 0;
      const fadesOut = index < fragments.length - 1;

      await seek(video, fragment.start);
      if (recorder.state === "inactive") recorder.start(1000);
      else if (recorder.state === "paused") recorder.resume();

      await video.play();

      await new Promise<void>((resolve) => {
        const draw = () => {
          const time = video.currentTime;
          const into = time - fragment.start;
          const left = fragment.end - time;
          let alpha = 1;
          if (fadesIn && into < fade) alpha = Math.max(0, into / fade);
          if (fadesOut && left < fade) alpha = Math.min(alpha, Math.max(0, left / fade));

          surface.globalAlpha = 1;
          surface.fillStyle = "#000000";
          surface.fillRect(0, 0, width, height);
          surface.globalAlpha = alpha;
          surface.drawImage(video, 0, 0, width, height);
          surface.globalAlpha = 1;
          gain.gain.value = Math.max(0.0001, alpha);

          onProgress?.(total > 0 ? Math.min(1, (elapsed + Math.max(0, into)) / total) : 0);

          if (time >= fragment.end || video.ended) {
            resolve();
            return;
          }
          requestAnimationFrame(draw);
        };
        requestAnimationFrame(draw);
      });

      video.pause();
      elapsed += length;
      if (recorder.state === "recording" && index < fragments.length - 1) recorder.pause();
    }

    if (recorder.state === "inactive") throw new Error("no_fragments");
    recorder.stop();
    await finished;
  } finally {
    await cleanup();
  }

  const blob = new Blob(chunks, { type: mime });
  const measured = await readBlobDuration(blob);
  const seconds = measured ?? total;
  const extension = mime.includes("mp4") ? "mp4" : "webm";
  return { blob, mime, extension, seconds };
}
