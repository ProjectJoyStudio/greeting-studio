/** Keep the same physical face, or its containing spread, after resizing. */
export function viewerStartPage(position: number, faceCount: number, portrait: boolean): number {
  const page = Math.max(0, Math.min(Math.trunc(position), Math.max(0, faceCount - 1)));
  if (portrait || page === 0 || page === faceCount - 1) return page;
  return page % 2 === 0 ? page - 1 : page;
}