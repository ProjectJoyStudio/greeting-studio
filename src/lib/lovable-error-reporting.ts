type LovableErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type LovableEvents = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: LovableErrorOptions,
  ) => void;
};

declare global {
  interface Window {
    __lovableEvents?: LovableEvents;
    __lovableReportRuntimeError?: (payload: {
      message: string;
      stack?: string;
      filename?: string;
    }) => void;
  }
}

export function reportLovableError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.__lovableEvents?.captureException?.(
    error,
    {
      source: "react_error_boundary",
      route: window.location.pathname,
      ...context,
    },
    {
      mechanism: "react_error_boundary",
      handled: false,
      severity: "error",
    },
  );
  // Prod React does not rethrow boundary-caught errors to window.onerror, so the
  // editor's telemetry never sees them. Forward to lovable.js's reporting hook,
  // which is present only inside the editor preview.
  // Loaders and server fns commonly throw a raw Response; String(it) is the
  // opaque "[object Response]", so pull out the status and URL instead.
  const baseMessage =
    error instanceof Response
      ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);
  // Prefix the short Error ID shown on the full-page error screen so the exact
  // PJ-XXXXXX value is searchable in runtime logs alongside the original message.
  const errorId = typeof context["errorId"] === "string" ? (context["errorId"] as string) : undefined;
  const errorName = error instanceof Error ? error.name : undefined;
  const message = errorId ? `[${errorId}] ${baseMessage}` : baseMessage;
  const stack = error instanceof Error ? error.stack : undefined;
  const componentStack =
    typeof context["componentStack"] === "string" ? (context["componentStack"] as string) : undefined;
  window.__lovableReportRuntimeError?.({
    message,
    stack: [
      errorId ? `Error ID: ${errorId}` : undefined,
      errorName ? `name: ${errorName}` : undefined,
      `source: ${String(context["source"] ?? "react_error_boundary")}`,
      `pathname: ${window.location.pathname}`,
      `timestamp: ${new Date().toISOString()}`,
      stack,
      componentStack,
    ]
      .filter(Boolean)
      .join("\n"),
    filename: window.location.pathname,
  });
}

