// ---------------------------------------------------------------------------
// Final rendering of a live greeting card. The greeting is painted into every
// frame, so the exported file itself carries the text — it is never only a
// browser overlay. Runs entirely in the browser; the finished file is then
// stored in the person's own space.
// ---------------------------------------------------------------------------

import { supabase } from "@/integrations/supabase/client";
import type { CardTextDesign } from "@/lib/greeting-card/types";
import {
  drawGreeting,
  layoutGreeting,
  validateGreetingLayout,
  type GreetingBox,
} from "./text-render";

export const LIVE_VIDEO_BUCKET = "live-greeting-card-videos";

const MIME_CANDIDATES = [
  "video/mp4;codecs=avc1.42E01E",
  "video/mp4;codecs=h264",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

/**
 * Same list, but every option also carries a sound track for the music. The
 * order matters: a format that names its sound codec is always preferred, so
 * the finished file really carries the music. A plain "video/mp4" request is
 * last, because some browsers accept it and then write a file whose sound
 * cannot be played outside that browser.
 */
const MIME_CANDIDATES_WITH_AUDIO = [
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4;codecs=h264,aac",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4",
];


function pickMime(withAudio = false): string {
  const supported = typeof MediaRecorder !== "undefined";
  if (!supported) throw new Error("recording_unsupported");
  for (const mime of withAudio ? MIME_CANDIDATES_WITH_AUDIO : MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  throw new Error("recording_unsupported");
}

/** The background music a person chose, exactly as it must sound in the file. */
export interface BurnMusic {
  /** Playable link of the chosen track. */
  url: string;
  /** 0…1, the level the person set. */
  volume: number;
  /** A shorter track may repeat softly until the animation ends. */
  loop: boolean;
  fadeInSeconds: number;
  fadeOutSeconds: number;
}

function loadVideo(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const el = document.createElement("video");
    el.crossOrigin = "anonymous";
    el.muted = true;
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

/** Loads the music and feeds it into the recording at the chosen level. */
async function prepareMusic(
  music: BurnMusic,
  seconds: number,
  stream: MediaStream,
): Promise<{ context: AudioContext; start: () => void; stop: () => Promise<void> }> {
  const response = await fetch(music.url);
  if (!response.ok) throw new Error("music_fetch_failed");
  const bytes = await response.arrayBuffer();
  const context = new AudioContext();
  if (context.state === "suspended") await context.resume();
  // Some browsers only expose the callback form; both are handled here.
  const buffer = await new Promise<AudioBuffer>((resolve, reject) => {
    const promise = context.decodeAudioData(bytes.slice(0), resolve, reject) as unknown;
    if (promise && typeof (promise as Promise<AudioBuffer>).then === "function") {
      (promise as Promise<AudioBuffer>).then(resolve, reject);
    }
  });

  const length = seconds > 0 ? seconds : buffer.duration;
  const level = Math.max(0.0001, Math.min(1, music.volume));
  const fadeIn = Math.min(music.fadeInSeconds, length / 4);
  const fadeOut = Math.min(music.fadeOutSeconds, length / 4);

  const gain = context.createGain();
  const destination = context.createMediaStreamDestination();
  gain.connect(destination);
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = music.loop && buffer.duration < length;
  source.connect(gain);

  for (const track of destination.stream.getAudioTracks()) stream.addTrack(track);

  let started = false;
  return {
    context,
    // The fades and the end of the track are scheduled from the moment the
    // recording really begins. Scheduling a stop before the source has been
    // started is invalid, which is why both happen together here.
    start: () => {
      if (started) return;
      started = true;
      const now = context.currentTime;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(level, now + Math.max(0.05, fadeIn));
      gain.gain.setValueAtTime(level, now + Math.max(Math.max(0.05, fadeIn), length - fadeOut));
      gain.gain.linearRampToValueAtTime(0.0001, now + length);
      source.start(now);
      source.stop(now + length);
    },
    stop: async () => {
      try {
        if (started) source.stop();
      } catch {
        /* already finished */
      }
      for (const track of destination.stream.getAudioTracks()) track.stop();
      await context.close().catch(() => undefined);
    },
  };
}

export interface RenderResult {
  blob: Blob;
  mime: string;
  extension: string;
  /** True when the greeting was confirmed to be part of the exported frames. */
  verified: boolean;
  /** True when the exported frames do not match the single expected text layer. */
  duplicate: boolean;
}

/**
 * Draws the animation frame by frame with the greeting on top and captures the
 * result as a new video file.
 */
export async function renderFinalVideo(
  videoUrl: string,
  text: string,
  design: CardTextDesign,
  onProgress?: (ratio: number) => void,
  music?: BurnMusic | null,
): Promise<RenderResult> {
  const mime = pickMime(Boolean(music));
  // Wait for the exact editor font before measuring. Without this, a fallback
  // font can produce different line breaks during the first export frame.
  if (typeof document !== "undefined" && "fonts" in document) {
    await document.fonts.ready;
  }
  const video = await loadVideo(videoUrl);
  const width = video.videoWidth || 720;
  const height = video.videoHeight || 720;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas_unavailable");

  const finalText = text;
  const finalDesign = { ...design };
  if (finalText.trim()) {
    const layout = layoutGreeting(width, height, finalText, finalDesign, ctx);
    if (!layout || !validateGreetingLayout(width, height, layout).valid) {
      throw new Error("invalid_text_layout");
    }
  }

  let box: GreetingBox | null = null;
  // Exactly one clean frame per tick: the surface is wiped, the animation is
  // drawn, and the single greeting layer is painted once on top.
  const paint = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.filter = "none";
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(video, 0, 0, width, height);
    box = drawGreeting(ctx, width, height, finalText, finalDesign);
  };

  await seek(video, 0);
  paint();

  const stream = canvas.captureStream(30);
  // The chosen music is played into the very same recording, so it becomes a
  // real sound track of the finished file — not a second player on the page.
  let audio: {
    context: AudioContext;
    start: () => void;
    stop: () => Promise<void>;
  } | null = null;
  if (music) {
    try {
      audio = await prepareMusic(music, video.duration || 0, stream);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "unknown";
      throw new Error(`music_load_failed: ${detail}`);
    }
  }
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };

  const finished = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
  });

  recorder.start(200);
  audio?.start();
  await video.play();

  await new Promise<void>((resolve) => {
    const tick = () => {
      if (video.ended || video.paused) {
        paint();
        resolve();
        return;
      }
      paint();
      onProgress?.(video.duration ? Math.min(1, video.currentTime / video.duration) : 0);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  // A short tail makes sure the very last frames are inside the file.
  await new Promise((r) => setTimeout(r, 250));
  recorder.stop();
  const blob = await finished;
  await audio?.stop();
  onProgress?.(1);

  // Some browsers accept an MP4 request but write a WebM file. The real type
  // of the recording decides the name, so the stored file is never mislabelled.
  const actualMime = recorder.mimeType || blob.type || mime;
  const extension = actualMime.startsWith("video/mp4") ? "mp4" : "webm";
  let verified = true;
  let duplicate = false;
  if (finalText.trim()) {
    const check = await verifyBurnedText(blob, video, box, finalText, finalDesign, width, height);
    verified = check.verified;
    duplicate = check.duplicate;
  }
  video.pause();
  video.removeAttribute("src");
  video.load();
  return { blob, mime: actualMime, extension, verified, duplicate };
}

/**
 * Confirms the greeting really is inside the exported file: the same moment of
 * the original animation and of the finished file are compared inside the
 * area the greeting occupies.
 */
async function verifyBurnedText(
  blob: Blob,
  original: HTMLVideoElement,
  box: GreetingBox | null,
  text: string,
  design: CardTextDesign,
  width: number,
  height: number,
): Promise<{ verified: boolean; duplicate: boolean }> {
  if (!box) return { verified: false, duplicate: false };
  const url = URL.createObjectURL(blob);
  try {
    const rendered = await loadVideo(url);
    const time = Math.min(
      Math.max(0.1, (rendered.duration || original.duration || 1) / 2),
      (rendered.duration || 1) - 0.05,
    );
    await seek(rendered, time);
    await seek(original, Math.min(time, Math.max(0, (original.duration || 1) - 0.05)));

    const crop = (draw: (g: CanvasRenderingContext2D) => void) => {
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(box!.width));
      c.height = Math.max(1, Math.round(box!.height));
      const g = c.getContext("2d", { willReadFrequently: true });
      if (!g) return null;
      draw(g);
      return g.getImageData(0, 0, c.width, c.height).data;
    };
    const grab = (source: HTMLVideoElement) =>
      crop((g) =>
        g.drawImage(source, box!.left, box!.top, box!.width, box!.height, 0, 0, g.canvas.width, g.canvas.height),
      );

    const a = grab(original);
    const b = grab(rendered);
    // The expected result: the clean animation with exactly one greeting layer.
    const expected = crop((g) => {
      const full = document.createElement("canvas");
      full.width = width;
      full.height = height;
      const fg = full.getContext("2d", { willReadFrequently: true });
      if (!fg) return;
      fg.drawImage(original, 0, 0, width, height);
      drawGreeting(fg, width, height, text, design);
      g.drawImage(full, box!.left, box!.top, box!.width, box!.height, 0, 0, g.canvas.width, g.canvas.height);
    });
    if (!a || !b || a.length !== b.length) return { verified: false, duplicate: false };

    let changed = 0;
    let expectedChanged = 0;
    let unexpectedChanged = 0;
    let mismatch = 0;
    for (let i = 0; i < a.length; i += 4) {
      const diff =
        Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
      if (diff > 60) changed += 1;
      if (expected) {
        const intended =
          Math.abs(expected[i] - a[i]) +
          Math.abs(expected[i + 1] - a[i + 1]) +
          Math.abs(expected[i + 2] - a[i + 2]);
        const d2 =
          Math.abs(expected[i] - b[i]) +
          Math.abs(expected[i + 1] - b[i + 1]) +
          Math.abs(expected[i + 2] - b[i + 2]);
        if (intended > 60) expectedChanged += 1;
        // A duplicate/shifted layer changes pixels where the one-layer
        // reference expects the clean animation. Encoding noise stays below
        // this deliberately conservative threshold.
        if (intended <= 60 && d2 > 120) unexpectedChanged += 1;
        if (d2 > 90) mismatch += 1;
      }
    }
    const pixels = a.length / 4 || 1;
    const duplicateLimit = Math.max(12, expectedChanged * 0.18);
    return {
      verified: changed / pixels > 0.005,
      // Require both unexpected glyph-like pixels and a meaningful mismatch
      // from the exact one-layer reference before blocking completion.
      duplicate:
        Boolean(expected) &&
        unexpectedChanged > duplicateLimit &&
        mismatch > Math.max(24, expectedChanged * 0.3),
    };
  } catch {
    return { verified: false, duplicate: false };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Stores the finished file in the person's own folder and returns its path. */
export async function uploadFinalVideo(
  animationId: string,
  blob: Blob,
  extension: string,
  mime: string,
): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) throw new Error("not_authenticated");
  const path = `${userId}/final/${animationId}.${extension}`;
  const { error } = await supabase.storage
    .from(LIVE_VIDEO_BUCKET)
    .upload(path, blob, { contentType: mime, upsert: true });
  if (error) throw new Error(error.message);
  return path;
}