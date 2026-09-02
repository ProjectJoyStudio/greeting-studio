/**
 * Diagnostic instrumentation for catastrophic/full-page errors.
 *
 * Purpose: when a user reports a full-page error, the visible short Error ID
 * must be findable in the logs together with the error surface that produced
 * it. This module changes no behaviour — it only generates IDs and logs.
 */

export type ErrorSource = "server-document" | "start-middleware" | "react-root-boundary";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars

/** Short, user-readable, non-sensitive id such as `PJ-A7K4F2`. */
export function newErrorId(): string {
  let out = "";
  const bytes = new Uint8Array(6);
  try {
    globalThis.crypto?.getRandomValues?.(bytes);
  } catch {
    /* fall through to Math.random below */
  }
  for (let i = 0; i < 6; i += 1) {
    const value = bytes[i] || Math.floor(Math.random() * 256);
    out += ALPHABET[value % ALPHABET.length];
  }
  return `PJ-${out}`;
}

function describeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  if (error instanceof Response) {
    return { name: "Response", message: `status ${error.status}`, stack: undefined };
  }
  return { name: typeof error, message: String(error), stack: undefined };
}

/**
 * Logs a catastrophic error with its Error ID and surface.
 * Never logs headers, cookies, tokens, bodies or query strings.
 */
export function logCatastrophicError(input: {
  errorId: string;
  source: ErrorSource;
  error: unknown;
  request?: Request;
  status?: number;
  isDocumentRequest?: boolean;
  extra?: Record<string, unknown>;
}): void {
  const { errorId, source, error, request, status, isDocumentRequest, extra } = input;
  const described = describeError(error);

  let method: string | undefined;
  let path: string | undefined;
  if (request) {
    method = request.method;
    try {
      path = new URL(request.url).pathname; // pathname only — no query params
    } catch {
      path = undefined;
    }
  }

  console.error(
    `[catastrophic-error] ${JSON.stringify({
      errorId,
      source,
      timestamp: new Date().toISOString(),
      method,
      path,
      status,
      isDocumentRequest,
      errorName: described.name,
      errorMessage: described.message,
      ...extra,
    })}`,
  );
  if (described.stack) {
    console.error(`[catastrophic-error] ${errorId} stack:\n${described.stack}`);
  }
}

/** True when the request expects an HTML document (page load / refresh). */
export function isDocumentRequest(request: Request): boolean {
  const dest = request.headers.get("sec-fetch-dest");
  if (dest) return dest === "document";
  return (request.headers.get("accept") ?? "").includes("text/html");
}
