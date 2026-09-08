import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import {
  MEMORY_BOOK_DECORATIONS_BUCKET,
  MEMORY_BOOK_DECORATION_CATEGORIES,
  categoryLabelKey,
  fileTypeOf,
  type MemoryBookDecoration,
  type MemoryBookDecorationCategory,
} from "@/lib/memory-book/decorations";
import {
  adminAddMemoryBookDecoration,
  adminListMemoryBookDecorations,
  adminRemoveMemoryBookDecoration,
  adminUpdateMemoryBookDecoration,
} from "@/lib/memory-book/decorations.functions";

export const Route = createFileRoute("/admin/memory-book-decorations")({
  component: AdminDecorationsPage,
});

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

function AdminDecorationsPage() {
  const { t } = useI18n();
  const list = useServerFn(adminListMemoryBookDecorations);
  const add = useServerFn(adminAddMemoryBookDecoration);
  const update = useServerFn(adminUpdateMemoryBookDecoration);
  const remove = useServerFn(adminRemoveMemoryBookDecoration);

  const uploadRef = useRef<HTMLInputElement | null>(null);
  const replaceRef = useRef<HTMLInputElement | null>(null);
  const replacingId = useRef<string | null>(null);

  const [decorations, setDecorations] = useState<MemoryBookDecoration[]>([]);
  const [category, setCategory] = useState<MemoryBookDecorationCategory>("hearts");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    list()
      .then((res) => setDecorations(res.decorations))
      .catch(() => setDecorations([]));
  }, [list]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Stores the file itself — an SVG stays a scalable SVG. */
  async function store(file: File): Promise<{ path: string; fileType: "svg" | "png" } | null> {
    const fileType = fileTypeOf(file.name);
    if (!fileType) {
      setError(t("mbdec_admin_bad_type"));
      return null;
    }
    const path = `${Date.now()}-${safeName(file.name)}`;
    const { error: upErr } = await supabase.storage
      .from(MEMORY_BOOK_DECORATIONS_BUCKET)
      .upload(path, file, {
        upsert: false,
        contentType: fileType === "svg" ? "image/svg+xml" : "image/png",
      });
    if (upErr) {
      setError(upErr.message);
      return null;
    }
    return { path, fileType };
  }

  async function upload(file: File) {
    setBusy(true);
    setNote(null);
    setError(null);
    try {
      const stored = await store(file);
      if (!stored) return;
      const res = await add({
        data: { name: name.trim() || file.name, category, path: stored.path, fileType: stored.fileType },
      });
      setDecorations(res.decorations);
      if (res.ok) {
        setName("");
        setNote(t("mbdec_admin_saved"));
      } else setError(t("mbdec_admin_failed"));
    } catch {
      setError(t("mbdec_admin_failed"));
    } finally {
      setBusy(false);
      if (uploadRef.current) uploadRef.current.value = "";
    }
  }

  async function replaceFile(id: string, file: File) {
    setBusy(true);
    setError(null);
    try {
      const stored = await store(file);
      if (!stored) return;
      const res = await update({ data: { id, path: stored.path, fileType: stored.fileType } });
      setDecorations(res.decorations);
      setNote(t("mbdec_admin_saved"));
    } catch {
      setError(t("mbdec_admin_failed"));
    } finally {
      setBusy(false);
      if (replaceRef.current) replaceRef.current.value = "";
      replacingId.current = null;
    }
  }

  async function patch(id: string, data: Partial<{ name: string; category: string; enabled: boolean }>) {
    setBusy(true);
    try {
      const res = await update({ data: { id, ...data } });
      setDecorations(res.decorations);
      setNote(t("mbdec_admin_saved"));
    } catch {
      setError(t("mbdec_admin_failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="font-[Fraunces] text-2xl font-semibold">{t("mbdec_admin_title")}</h1>

      <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">{t("mbdec_admin_hint")}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">{t("mbdec_admin_name")}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">{t("mbdec_admin_category")}</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as MemoryBookDecorationCategory)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              {MEMORY_BOOK_DECORATION_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(categoryLabelKey(c))}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">{t("mbdec_admin_upload")}</p>
          <input
            ref={uploadRef}
            type="file"
            accept=".svg,image/svg+xml,.png,image/png"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
            className="block w-full text-sm"
          />
          {busy && <p className="text-sm text-muted-foreground">{t("mbdec_admin_uploading")}</p>}
          {note && <p className="text-sm text-emerald-600">{note}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </section>

      <input
        ref={replaceRef}
        type="file"
        accept=".svg,image/svg+xml,.png,image/png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const id = replacingId.current;
          if (file && id) void replaceFile(id, file);
        }}
      />

      <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
        {decorations.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("mbdec_admin_none")}</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {decorations.map((d) => (
              <li key={d.id} className="space-y-3 rounded-xl border border-border/60 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-[repeating-conic-gradient(#e5e5e5_0%_25%,#ffffff_0%_50%)] bg-[length:16px_16px]">
                    {d.url ? (
                      <img src={d.url} alt={d.name} className="max-h-16 max-w-16 object-contain" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <input
                      defaultValue={d.name}
                      onBlur={(e) => {
                        if (e.target.value !== d.name) void patch(d.id, { name: e.target.value });
                      }}
                      className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm"
                    />
                    <select
                      value={d.category}
                      onChange={(e) => void patch(d.id, { category: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm"
                    >
                      {MEMORY_BOOK_DECORATION_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {t(categoryLabelKey(c))}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      {d.fileType.toUpperCase()} ·{" "}
                      {d.enabled ? t("mbdec_admin_enabled") : t("mbdec_admin_disabled")}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void patch(d.id, { enabled: !d.enabled })}
                    className="rounded-md border border-border px-3 py-1 text-xs font-medium"
                  >
                    {d.enabled ? t("mbdec_admin_disable") : t("mbdec_admin_enable")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      replacingId.current = d.id;
                      replaceRef.current?.click();
                    }}
                    className="rounded-md border border-border px-3 py-1 text-xs font-medium"
                  >
                    {t("mbdec_admin_replace")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setBusy(true);
                      void remove({ data: { id: d.id } })
                        .then((res) => setDecorations(res.decorations))
                        .catch(() => setError(t("mbdec_admin_failed")))
                        .finally(() => setBusy(false));
                    }}
                    className="rounded-md border border-destructive/50 px-3 py-1 text-xs font-medium text-destructive"
                  >
                    {t("mbdec_admin_delete")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
