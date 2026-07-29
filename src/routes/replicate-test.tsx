import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import {
  generateTestImage,
  type AttemptReport,
  type GenerateTestImageResult,
} from "@/lib/replicate/generate.functions";

const TEST_PROMPT =
  "Beautiful summer garden with colorful flowers, butterflies, soft sunlight, ultra realistic, high quality.";

export const Route = createFileRoute("/replicate-test")({
  head: () => ({
    meta: [
      { title: "Image Engine Test — Project Joy" },
      {
        name: "description",
        content:
          "Internal Project Joy diagnostic page for verifying the image generation engine end to end.",
      },
      { property: "og:title", content: "Image Engine Test — Project Joy" },
      {
        property: "og:description",
        content: "Internal diagnostic page for the Project Joy image generation engine.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ReplicateTestPage,
});

function ReplicateTestPage() {
  const generate = useServerFn(generateTestImage);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateTestImageResult | null>(null);

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const res = await generate({ data: { prompt: TEST_PROMPT } });
      setResult(res);
    } catch (err) {
      setResult({
        ok: false,
        attempts: [
          {
            model: "-",
            ok: false,
            httpStatus: null,
            predictionId: null,
            predictionStatus: null,
            errorCode: "request_failed",
            errorMessage: err instanceof Error ? err.message : String(err),
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <h1 className="font-display text-3xl font-semibold text-foreground">
        Image engine test
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Diagnostic only. Generates one image from a fixed prompt and displays it. Nothing is saved.
      </p>

      <pre className="mt-6 whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
        {TEST_PROMPT}
      </pre>

      <button
        onClick={run}
        disabled={loading}
        className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {loading ? "Generating…" : "Generate test image"}
      </button>

      {loading && (
        <p className="mt-4 text-sm text-muted-foreground">
          Waiting for the generation to finish — this can take up to a minute.
        </p>
      )}

      {result && (
        <div className="mt-6 space-y-3">
          {result.attempts.map((a: AttemptReport, idx: number) => (
            <div
              key={`${a.model}-${idx}`}
              className={
                a.ok
                  ? "rounded-lg border border-border bg-muted/40 p-4"
                  : "rounded-lg border border-destructive/40 bg-destructive/10 p-4"
              }
            >
              <p className={a.ok ? "text-sm font-semibold text-foreground" : "text-sm font-semibold text-destructive"}>
                {a.ok ? "Succeeded" : "Failed"} — {a.model}
              </p>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <dt>HTTP status</dt>
                <dd>{a.httpStatus ?? "—"}</dd>
                <dt>Prediction ID</dt>
                <dd className="break-all">{a.predictionId ?? "—"}</dd>
                <dt>Prediction status</dt>
                <dd>{a.predictionStatus ?? "—"}</dd>
                {a.errorCode ? (
                  <>
                    <dt>Error code</dt>
                    <dd>{a.errorCode}</dd>
                  </>
                ) : null}
                {a.errorMessage ? (
                  <>
                    <dt>Error message</dt>
                    <dd className="break-words">{a.errorMessage}</dd>
                  </>
                ) : null}
                {a.detail ? (
                  <>
                    <dt>Detail</dt>
                    <dd className="break-words">{a.detail}</dd>
                  </>
                ) : null}
              </dl>
            </div>
          ))}
        </div>
      )}

      {result?.ok && (
        <div className="mt-6">
          <img
            src={result.imageUrl}
            alt="Generated summer garden with colorful flowers and butterflies"
            className="w-full rounded-xl border border-border shadow-lg"
          />
          <p className="mt-3 break-all text-xs text-muted-foreground">
            Model {result.model} · {result.imageUrl}
          </p>
        </div>
      )}

    </main>
  );
}