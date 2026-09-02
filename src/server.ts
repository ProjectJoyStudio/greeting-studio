import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import {
  isDocumentRequest,
  logCatastrophicError,
  newErrorId,
} from "./lib/error-diagnostics";
import { renderErrorPage } from "./lib/error-page";


type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(
  response: Response,
  request: Request,
): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  const errorId = newErrorId();
  logCatastrophicError({
    errorId,
    source: "server-document",
    error: consumeLastCapturedError() ?? new Error("h3 swallowed SSR error"),
    request,
    status: response.status,
    isDocumentRequest: isDocumentRequest(request),
    extra: { swallowed: true },
  });
  return new Response(renderErrorPage(errorId), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response, request);
    } catch (error) {
      const errorId = newErrorId();
      logCatastrophicError({
        errorId,
        source: "server-document",
        error,
        request,
        status: 500,
        isDocumentRequest: isDocumentRequest(request),
        extra: { swallowed: false },
      });
      return new Response(renderErrorPage(errorId), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },

};
