import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { useI18n } from "@/lib/i18n";
import { getMemoryBookDemo, setMemoryBookDemo } from "@/lib/memory-book/demo-book.functions";

export const Route = createFileRoute("/admin/memory-book")({
  component: AdminMemoryBookPage,
});

function AdminMemoryBookPage() {
  const { t } = useI18n();
  const load = useServerFn(getMemoryBookDemo);
  const save = useServerFn(setMemoryBookDemo);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    load()
      .then((res) => {
        if (active) setUrl(res.url ?? "");
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load]);

  async function persist(next: string | null) {
    setStatus(null);
    setError(null);
    try {
      const res = await save({ data: { url: next } });
      setUrl(res.url ?? "");
      setStatus(t("mb_admin_saved"));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-[Fraunces] text-2xl font-semibold">{t("mb_admin_title")}</h1>

      <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{t("mb_admin_demo_title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("mb_admin_demo_hint")}</p>

        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">{t("mb_admin_loading")}</p>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="block text-sm font-medium" htmlFor="mb-demo-url">
              {t("mb_admin_url")}
            </label>
            <input
              id="mb-demo-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => persist(url.trim() ? url.trim() : null)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                {t("mb_admin_save")}
              </button>
              <button
                type="button"
                onClick={() => persist(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium"
              >
                {t("mb_admin_clear")}
              </button>
            </div>
            {status && <p className="text-sm text-emerald-600">{status}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}
      </section>
    </div>
  );
}
