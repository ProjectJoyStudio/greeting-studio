import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

/** A missing/expired bearer token is a recoverable client state, not a crash. */
function isAuthError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return /^unauthorized/i.test(message.trim());
}

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    // Right after a phone unlock the token can be absent for a moment. That must
    // return a clean, retryable 401 instead of the static "something went wrong"
    // page, so the client can wait for the session and repeat the request.
    if (isAuthError(error)) {
      return new Response(JSON.stringify({ error: "unauthorized", recoverable: true }), {
        status: 401,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});


export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware],
}));
