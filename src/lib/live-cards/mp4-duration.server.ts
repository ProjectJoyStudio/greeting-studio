// Reads the playing time of a finished MP4 so the delivered animation can be
// compared with the length the person asked for. Never throws.

function typeAt(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
}

/** Seconds of the movie header, or null when the file cannot be read. */
export function readMp4DurationSeconds(input: Uint8Array): number | null {
  try {
    const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
    let offset = 0;
    while (offset + 8 <= input.length) {
      const size = view.getUint32(offset);
      const type = typeAt(input, offset + 4);
      if (size < 8) return null;
      if (type === "moov") {
        let inner = offset + 8;
        const end = Math.min(offset + size, input.length);
        while (inner + 8 <= end) {
          const innerSize = view.getUint32(inner);
          if (innerSize < 8) return null;
          if (typeAt(input, inner + 4) === "mvhd") {
            const version = input[inner + 8];
            const scale = version === 1 ? view.getUint32(inner + 28) : view.getUint32(inner + 20);
            const duration =
              version === 1 ? Number(view.getBigUint64(inner + 32)) : view.getUint32(inner + 24);
            if (!scale) return null;
            return Math.round((duration / scale) * 100) / 100;
          }
          inner += innerSize;
        }
        return null;
      }
      offset += size;
    }
    return null;
  } catch {
    return null;
  }
}
