// Reads how long an MP3 recording plays, straight from its frames. Voice
// studios that do not report a length are measured here, so every spoken
// greeting reaches the rest of Project Joy with a real duration.

const BITRATES_V1_L3 = [
  0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0,
];
const BITRATES_V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];
const RATES_V1 = [44100, 48000, 32000, 0];
const RATES_V2 = [22050, 24000, 16000, 0];
const RATES_V25 = [11025, 12000, 8000, 0];

/** Seconds of audio in an MP3 buffer, or 0 when it cannot be measured. */
export function mp3DurationSeconds(bytes: Uint8Array): number {
  let i = 0;
  // Skip an ID3 tag when the file starts with one.
  if (bytes.length > 10 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    const size =
      ((bytes[6]! & 0x7f) << 21) |
      ((bytes[7]! & 0x7f) << 14) |
      ((bytes[8]! & 0x7f) << 7) |
      (bytes[9]! & 0x7f);
    i = 10 + size;
  }

  let seconds = 0;
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff || (bytes[i + 1]! & 0xe0) !== 0xe0) {
      i += 1;
      continue;
    }
    const versionBits = (bytes[i + 1]! >> 3) & 0x03;
    const layerBits = (bytes[i + 1]! >> 1) & 0x03;
    if (versionBits === 1 || layerBits !== 1) {
      i += 1;
      continue;
    }
    const bitrateIndex = (bytes[i + 2]! >> 4) & 0x0f;
    const rateIndex = (bytes[i + 2]! >> 2) & 0x03;
    const padding = (bytes[i + 2]! >> 1) & 0x01;

    const isV1 = versionBits === 3;
    const bitrate = (isV1 ? BITRATES_V1_L3 : BITRATES_V2_L3)[bitrateIndex]! * 1000;
    const rate = (versionBits === 3 ? RATES_V1 : versionBits === 2 ? RATES_V2 : RATES_V25)[
      rateIndex
    ]!;
    if (!bitrate || !rate) {
      i += 1;
      continue;
    }
    const samples = isV1 ? 1152 : 576;
    const frameLength = Math.floor((samples / 8) * (bitrate / rate)) + padding;
    if (frameLength <= 4) {
      i += 1;
      continue;
    }
    seconds += samples / rate;
    i += frameLength;
  }

  return Math.round(seconds * 100) / 100;
}
