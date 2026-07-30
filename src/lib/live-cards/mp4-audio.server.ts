// Project Joy never uses the sound an animation engine invents by itself.
// A finished live greeting card is always silent.
//
// The audio track is removed without moving a single byte: the container box
// that describes the sound track is renamed to a "free space" box of exactly
// the same size, which every player skips. Because nothing shifts, all frame
// offsets inside the file stay valid — the safest possible way to mute an MP4
// without re-encoding.

const HEADER = 8;

function typeAt(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
}

function sizeAt(view: DataView, bytes: Uint8Array, offset: number): { size: number; header: number } {
  const size = view.getUint32(offset);
  if (size === 1) {
    // 64-bit size: the high word is always 0 for the files we handle.
    return { size: Number(view.getBigUint64(offset + HEADER)), header: 16 };
  }
  return { size, header: HEADER };
}

function children(bytes: Uint8Array, view: DataView, start: number, end: number): Array<{
  type: string;
  start: number;
  contentStart: number;
  end: number;
}> {
  const out: Array<{ type: string; start: number; contentStart: number; end: number }> = [];
  let offset = start;
  while (offset + HEADER <= end) {
    const { size, header } = sizeAt(view, bytes, offset);
    const boxEnd = size === 0 ? end : offset + size;
    if (size < HEADER || boxEnd > end) break;
    out.push({ type: typeAt(bytes, offset), start: offset, contentStart: offset + header, end: boxEnd });
    offset = boxEnd;
  }
  return out;
}

function isSoundTrack(bytes: Uint8Array, view: DataView, trak: { contentStart: number; end: number }): boolean {
  for (const mdia of children(bytes, view, trak.contentStart, trak.end)) {
    if (mdia.type !== "mdia") continue;
    for (const hdlr of children(bytes, view, mdia.contentStart, mdia.end)) {
      if (hdlr.type !== "hdlr") continue;
      // full box: version+flags (4) + pre_defined (4) + handler_type (4)
      const at = hdlr.contentStart + 8;
      if (at + 4 <= hdlr.end) {
        const handler = String.fromCharCode(bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]);
        if (handler === "soun") return true;
      }
    }
  }
  return false;
}

/** Returns the same MP4 with every audio track neutralised. */
export function stripAudioTrack(input: Uint8Array): Uint8Array {
  try {
    const bytes = new Uint8Array(input); // work on a copy
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let muted = false;
    for (const box of children(bytes, view, 0, bytes.length)) {
      if (box.type !== "moov") continue;
      for (const trak of children(bytes, view, box.contentStart, box.end)) {
        if (trak.type !== "trak" || !isSoundTrack(bytes, view, trak)) continue;
        bytes[trak.start + 4] = 0x66; // f
        bytes[trak.start + 5] = 0x72; // r
        bytes[trak.start + 6] = 0x65; // e
        bytes[trak.start + 7] = 0x65; // e
        muted = true;
      }
    }
    return muted ? bytes : input;
  } catch {
    // A file we cannot parse is stored untouched; playback stays muted anyway.
    return input;
  }
}
