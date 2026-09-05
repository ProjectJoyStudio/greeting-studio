import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import {
  MEMORY_BOOK_DEMO_BUCKET,
  getMemoryBookDemoAdmin,
  listMemoryBookDemoMaterials,
  setMemoryBookDemo,
  type MemoryBookDemoKind,
  type MemoryBookDemoMaterial,
} from "@/lib/memory-book/demo-book.functions";

export const Route = createFileRoute("/admin/memory-book")({
  component: AdminMemoryBookPage,
});

function kindForFile(name: string): MemoryBookDemoKind {
  const lower = name.toLowerCase();
  if (/\.(mp4|webm|mov|m4v)$/.test(lower)) return "video";
  if (/\.(png|jpe?g|webp|gif|avif)$/.test(lower)) return "image";
  return "book";
}

function AdminMemoryBookPage() {
  const { t } = useI18n();
  const load = useServerFn(getMemoryBookDemoAdmin);
  const save = useServerFn(setMemoryBookDemo);
  const listMaterials = useServerFn(listMemoryBookDemoMaterials);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<MemoryBookDemoKind>("book");
  const [current, setCurrent] = useState<{ label: string | null; previewUrl: string | null }>({
    label: null,
    previewUrl: null,
  });
  const [materials, setMaterials] = useState<MemoryBookDemoMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshMaterials = useCallback(() => {
    listMaterials()
      .then((res) => setMaterials(res.materials))
      .catch(() => setMaterials([]));
  }, [listMaterials]);

  useEffect(() => {
    let active = true;
    load()
      .then((res) => {
        if (!active) return;
        setKind(res.kind);
        setUrl(res.url ?? "");
        setCurrent({ label: res.path ?? res.url, previewUrl: res.previewUrl });
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    refreshMaterials();
    return () => {
      active = false;
    };
  }, [load, refreshMaterials]);

  async function persist(next: {
    kind: MemoryBookDemoKind;
    url?: string | null;
    bucket?: string | null;
    path?: string | null;
  }) {
    setStatus(null);
    setError(null);
    try {
      const res = await save({ data: next });
      setKind(res.kind);
      setUrl(next.bucket ? "" : (next.url ?? ""));
      setCurrent({ label: next.path ?? next.url ?? null, previewUrl: res.url });
      setStatus(t("mb_admin_saved"));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function upload(file: File) {
    setStatus(null);
    setError(null);
    setUploading(true);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage
        .from(MEMORY_BOOK_DEMO_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type || undefined });
      if (upErr) throw new Error(upErr.message);
      await persist({ kind: kindForFile(file.name), bucket: MEMORY_BOOK_DEMO_BUCKET, path });
      refreshMaterials();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
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
          <div className="mt-4 space-y-5">
            <p className="text-sm">
              <span className="font-medium">{t("mb_admin_current")}: </span>
              {current.label ? (
                <span className="break-all text-muted-foreground">{current.label}</span>
              ) : (
                <span className="text-muted-foreground">{t("mb_admin_none")}</span>
              )}
            </p>

            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="mb-demo-kind">
                {t("mb_admin_kind")}
              </label>
              <select
                id="mb-demo-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as MemoryBookDemoKind)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="book">{t("mb_admin_kind_book")}</option>
                <option value="video">{t("mb_admin_kind_video")}</option>
                <option value="image">{t("mb_admin_kind_image")}</option>
              </select>
            </div>

            <div className="space-y-2">
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
                  onClick={() => persist({ kind, url: url.trim() ? url.trim() : null })}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                >
                  {t("mb_admin_save")}
                </button>
                <button
                  type="button"
                  onClick={() => persist({ kind: "book", url: null })}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium"
                >
                  {t("mb_admin_clear")}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">{t("mb_admin_upload")}</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*,.html,.htm,.pdf,.zip"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file);
                }}
                className="block w-full text-sm"
              />
              {uploading && <p className="text-sm text-muted-foreground">{t("mb_admin_uploading")}</p>}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">{t("mb_admin_existing")}</p>
              {materials.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("mb_admin_none")}</p>
              ) : (
                <ul className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-border/60 p-2">
                  {materials.map((m) => (
                    <li
                      key={`${m.bucket}/${m.path}`}
                      className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        <span className="text-muted-foreground">
                          {m.kind === "video"
                            ? t("mb_admin_kind_video")
                            : m.kind === "image"
                              ? t("mb_admin_kind_image")
                              : t("mb_admin_kind_book")}{" "}
                          ·{" "}
                        </span>
                        {m.label}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          persist({ kind: m.kind, bucket: m.bucket, path: m.path })
                        }
                        className="shrink-0 rounded-md border border-border px-3 py-1 text-xs font-medium"
                      >
                        {t("mb_admin_use")}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {status && <p className="text-sm text-emerald-600">{status}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}
      </section>
    </div>
  );
}
