// The one authoritative sound of a finished personal video greeting.
//
// The engine returns a film that already speaks the greeting. The chosen
// background music used to exist only as a second player on the page, so the
// downloaded file was silent underneath the voice. Here the greeting voice and
// the music are mixed once, at exactly the volumes the customer set, and the
// result is written back into the film itself. Preview and download then play
// the very same file.

import {
  ALL_FORMATS,
  AudioBufferSink,
  AudioBufferSource,
  BlobSource,
  BufferTarget,
  EncodedPacketSink,
  EncodedVideoPacketSource,
  getFirstEncodableAudioCodec,
  Input,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
} from "mediabunny";

import type { PvgMusicSettings } from "@/lib/music/types";

/** True when the customer actually chose music for this order. */
export function hasMusicChoice(music: PvgMusicSettings): boolean {
  if (music.mode === "library") return Boolean(music.trackBucket && music.trackPath);
  if (music.mode === "upload") return Boolean(music.uploadBucket && music.uploadPath);
  return false;
}

/**
 * A short, stable fingerprint of everything that shapes the sound. When the
 * customer changes music or a volume, the fingerprint changes and the film is
 * mixed again.
 */
export function musicMixSignature(music: PvgMusicSettings): string {
  if (!hasMusicChoice(music)) return "none";
  const source =
    music.mode === "upload"
      ? `${music.uploadBucket}/${music.uploadPath}`
      : `${music.trackBucket}/${music.trackPath}`;
  const duck = music.ducking.enabled ? music.ducking.duckedGain : 1;
  return [
    "v1",
    source,
    music.voiceVolume.toFixed(3),
    music.musicVolume.toFixed(3),
    duck.toFixed(3),
    music.fadeInSeconds,
    music.fadeOutSeconds,
    music.loopWhenShorter ? "loop" : "once",
  ].join("|");
}

/** The page can only mix where the browser can decode and encode media. */
export function canMixInBrowser(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as unknown as { AudioEncoder?: unknown }).AudioEncoder !== "undefined" &&
    typeof (window as unknown as { AudioDecoder?: unknown }).AudioDecoder !== "undefined" &&
    typeof (window as unknown as { OfflineAudioContext?: unknown }).OfflineAudioContext !==
      "undefined"
  );
}

const SAMPLE_RATE = 48_000;

/**
 * Builds the finished sound: the greeting voice of the film at the chosen
 * voice level, and the music underneath at the chosen music level, with the
 * same gentle fades and looping the preview uses.
 */
async function mixedAudio(
  input: Input,
  musicBytes: ArrayBuffer | null,
  music: PvgMusicSettings,
  seconds: number,
): Promise<AudioBuffer> {
  const frames = Math.max(1, Math.ceil(seconds * SAMPLE_RATE));
  const context = new OfflineAudioContext(2, frames, SAMPLE_RATE);

  const voiceTrack = await input.getPrimaryAudioTrack();
  if (voiceTrack) {
    const voiceGain = context.createGain();
    voiceGain.gain.value = music.voiceVolume;
    voiceGain.connect(context.destination);
    const sink = new AudioBufferSink(voiceTrack);
    for await (const wrapped of sink.buffers()) {
      const node = context.createBufferSource();
      node.buffer = wrapped.buffer;
      node.connect(voiceGain);
      node.start(Math.max(0, wrapped.timestamp));
    }
  }

  if (musicBytes) {
    const track = await context.decodeAudioData(musicBytes.slice(0));
    const level = music.musicVolume * (music.ducking.enabled ? music.ducking.duckedGain : 1);
    const gain = context.createGain();
    const fadeIn = Math.min(music.fadeInSeconds, seconds / 3);
    const fadeOut = Math.min(music.fadeOutSeconds, seconds / 3);
    gain.gain.setValueAtTime(0.0001, 0);
    gain.gain.linearRampToValueAtTime(Math.max(level, 0.0001), fadeIn);
    gain.gain.setValueAtTime(Math.max(level, 0.0001), Math.max(fadeIn, seconds - fadeOut));
    gain.gain.linearRampToValueAtTime(0.0001, seconds);
    gain.connect(context.destination);
    const node = context.createBufferSource();
    node.buffer = track;
    node.loop = music.loopWhenShorter;
    node.connect(gain);
    node.start(0);
    node.stop(seconds);
  }

  return context.startRendering();
}

/**
 * Returns the same film with one single, finished sound track. The picture is
 * copied frame for frame — it is never re-encoded, so nothing is lost.
 */
export async function mixMusicIntoVideo(
  videoBlob: Blob,
  musicBlob: Blob | null,
  music: PvgMusicSettings,
): Promise<Blob> {
  const input = new Input({ source: new BlobSource(videoBlob), formats: ALL_FORMATS });
  const videoTrack = await input.getPrimaryVideoTrack();
  if (!videoTrack) throw new Error("no_video_track");
  const voiceTrack = await input.getPrimaryAudioTrack();
  if (voiceTrack && !(await voiceTrack.canDecode())) throw new Error("voice_not_decodable");
  const codec = await getFirstEncodableAudioCodec(["aac", "opus"], {
    numberOfChannels: 2,
    sampleRate: SAMPLE_RATE,
  });
  if (!codec) throw new Error("no_audio_encoder");

  const seconds = await input.computeDuration();
  const audio = await mixedAudio(
    input,
    musicBlob ? await musicBlob.arrayBuffer() : null,
    music,
    seconds,
  );

  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target: new BufferTarget(),
  });

  const picture = new EncodedVideoPacketSource(videoTrack.codec!);
  output.addVideoTrack(picture, { rotation: videoTrack.rotation });
  const sound = new AudioBufferSource({ codec, quality: QUALITY_HIGH });
  output.addAudioTrack(sound);
  await output.start();

  const decoderConfig = await videoTrack.getDecoderConfig();
  const packets = new EncodedPacketSink(videoTrack);
  let first = true;
  for await (const packet of packets.packets()) {
    await picture.add(packet, first ? { decoderConfig: decoderConfig ?? undefined } : undefined);
    first = false;
  }
  picture.close();

  await sound.add(audio);
  sound.close();

  await output.finalize();
  const buffer = (output.target as BufferTarget).buffer;
  if (!buffer) throw new Error("mix_failed");
  return new Blob([buffer], { type: "video/mp4" });
}
