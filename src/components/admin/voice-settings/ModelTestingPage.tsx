import { useEffect, useMemo, useState } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Download, Loader2, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { listVoiceModels, listVoiceTests, updateVoiceTest } from "@/lib/admin/voice-settings/store";
import { providerLabel } from "@/lib/admin/voice-settings/types";
import {
  deleteVoiceTestRecords,
  runVoiceTest,
  signVoiceTests,
} from "@/lib/admin/voice-settings/voice-tests.functions";
import { PVG_VOICES } from "@/lib/personal-video/voice/catalog";

import { useLocal } from "./i18n";

const LANGS = ["en", "ru", "de", "uk", "fr", "pl"];
const inputCls =
  "w-full rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary/60";
const btn =
  "inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-xs text-foreground transition hover:bg-muted/50 disabled:opacity-50";

export function ModelTestingPage() {
  const { lang } = useI18n();
  const L = useLocal(lang);
  const qc = useQueryClient();
  const search = useSearch({ from: "/admin/voice-settings/testing" });

  const models = useQuery({ queryKey: ["voice-models"], queryFn: listVoiceModels });
  const tests = useQuery({ queryKey: ["voice-tests"], queryFn: listVoiceTests });

  const run = useServerFn(runVoiceTest);
  const sign = useServerFn(signVoiceTests);
  const removeTests = useServerFn(deleteVoiceTestRecords);

  const usable = useMemo(
    () => (models.data ?? []).filter((m) => m.status !== "disabled"),
    [models.data],
  );

  const [modelId, setModelId] = useState<string>(search.model ?? "");
  const [voiceId, setVoiceId] = useState(PVG_VOICES[0]!.id);
  const [language, setLanguage] = useState(lang);
  const [text, setText] = useState(
    "This is a Project Joy voice test. Warm, clear and truly personal.",
  );
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (usable.length === 0) return;
    const preselected = search.model && usable.some((m) => m.id === search.model) ? search.model : null;
    if (preselected && modelId !== preselected) {
      setModelId(preselected);
      return;
    }
    if (!modelId) setModelId(usable[0]!.id);
  }, [modelId, usable, search.model]);

  const rows = tests.data ?? [];

  useEffect(() => {
    const items = rows
      .filter((r) => r.storage_path && !urls[r.id])
      .map((r) => ({ id: r.id, bucket: r.storage_bucket, path: r.storage_path }));
    if (items.length === 0) return;
    void sign({ data: { items } }).then((res) => setUrls((prev) => ({ ...prev, ...res })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const generate = useMutation({
    mutationFn: async () => {
      const model = usable.find((m) => m.id === modelId);
      if (!model) throw new Error("model_required");
      return run({
        data: {
          provider: model.provider,
          modelKey: model.model_key,
          modelLabel: model.label,
          voiceId,
          language,
          text,
        },
      });
    },
    onSuccess: (res) => {
      if (res.audioUrl) setUrls((p) => ({ ...p, [res.test.id]: res.audioUrl! }));
      toast[res.test.status === "success" ? "success" : "error"](
        res.test.status === "success" ? L("vs_success") : (res.test.error_message ?? L("vs_error")),
      );
      void qc.invalidateQueries({ queryKey: ["voice-tests"] });
      void qc.invalidateQueries({ queryKey: ["voice-model-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (ids: string[]) => removeTests({ data: { ids } }),
    onSuccess: () => {
      toast.success(L("vs_deleted"));
      setSelected({});
      void qc.invalidateQueries({ queryKey: ["voice-tests"] });
      void qc.invalidateQueries({ queryKey: ["voice-model-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patch = useMutation({
    mutationFn: (v: { id: string; patch: { notes?: string | null; rating?: number | null; is_favorite?: boolean } }) =>
      updateVoiceTest(v.id, v.patch),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["voice-tests"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Link to="/admin/voice-settings" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> {L("vs_back")}
        </Link>
        <h1 className="font-[Fraunces] text-2xl font-semibold text-foreground">{L("vs_testing_link")}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{L("vs_test_sub")}</p>
      </header>

      <section className="grid gap-4 rounded-2xl border border-border/60 bg-card/80 p-5 lg:grid-cols-4">
        <label className="text-xs text-muted-foreground">
          {L("vs_model")}
          <select className={`${inputCls} mt-1`} value={modelId} onChange={(e) => setModelId(e.target.value)}>
            {usable.map((m) => (
              <option key={m.id} value={m.id}>
                {providerLabel(m.provider)} — {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          {L("vs_voice")}
          <select className={`${inputCls} mt-1`} value={voiceId} onChange={(e) => setVoiceId(e.target.value)}>
            {PVG_VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.gender})
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          {L("vs_language")}
          <select className={`${inputCls} mt-1`} value={language} onChange={(e) => setLanguage(e.target.value as typeof lang)}>
            {LANGS.map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="button"
            className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            disabled={generate.isPending || !modelId || text.trim().length === 0}
            onClick={() => generate.mutate()}
          >
            {generate.isPending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> {L("vs_running")}
              </span>
            ) : (
              L("vs_run")
            )}
          </button>
        </div>
        <label className="text-xs text-muted-foreground lg:col-span-4">
          {L("vs_text")} · {text.length} {L("vs_characters")}
          <textarea
            className={`${inputCls} mt-1 min-h-28`}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">{L("vs_results")}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {selectedIds.length} {L("vs_selected")}
            </span>
            <button
              type="button"
              className={btn}
              disabled={selectedIds.length === 0 || del.isPending}
              onClick={() => del.mutate(selectedIds)}
            >
              <Trash2 className="h-3.5 w-3.5" /> {L("vs_delete_selected")}
            </button>
            <button
              type="button"
              className={btn}
              disabled={rows.length === 0 || del.isPending}
              onClick={() => del.mutate(rows.map((r) => r.id))}
            >
              <Trash2 className="h-3.5 w-3.5" /> {L("vs_delete_all")}
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{L("vs_cleanup_note")}</p>

        {tests.isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/70 bg-card/50 p-8 text-center text-sm text-muted-foreground">
            {L("vs_no_tests")}
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border/60 bg-card/80 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={Boolean(selected[r.id])}
                      onChange={(e) => setSelected((p) => ({ ...p, [r.id]: e.target.checked }))}
                    />
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {r.model_label ?? r.model_key} · {r.voice_name ?? r.voice_id}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {providerLabel(r.provider)} · {r.language.toUpperCase()} · {r.character_count}{" "}
                        {L("vs_characters")} · {Number(r.duration_seconds).toFixed(2)}s ·{" "}
                        {new Date(r.created_at).toLocaleString()}
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">{r.voice_id}</div>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs ${
                      r.status === "success"
                        ? "bg-emerald-500/10 text-emerald-700"
                        : "bg-rose-500/10 text-rose-700"
                    }`}
                  >
                    {r.status === "success" ? L("vs_success") : L("vs_error")}
                  </span>
                </div>

                <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{r.text_content}</p>
                {r.error_message && <p className="mt-1 text-xs text-rose-600">{r.error_message}</p>}

                {urls[r.id] && (
                  <audio controls src={urls[r.id]} className="mt-3 w-full" preload="none">
                    <track kind="captions" />
                  </audio>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        aria-label={`${L("vs_rating")} ${n}`}
                        onClick={() => patch.mutate({ id: r.id, patch: { rating: n } })}
                      >
                        <Star
                          className={`h-4 w-4 ${
                            (r.rating ?? 0) >= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={btn}
                    onClick={() => patch.mutate({ id: r.id, patch: { is_favorite: !r.is_favorite } })}
                  >
                    <Star className={`h-3.5 w-3.5 ${r.is_favorite ? "fill-amber-400 text-amber-400" : ""}`} />
                    {L("vs_favorite")}
                  </button>
                  {urls[r.id] && (
                    <a className={btn} href={urls[r.id]} download target="_blank" rel="noreferrer">
                      <Download className="h-3.5 w-3.5" /> {L("vs_download")}
                    </a>
                  )}
                  <button type="button" className={btn} onClick={() => del.mutate([r.id])}>
                    <Trash2 className="h-3.5 w-3.5" /> {L("vs_delete")}
                  </button>
                </div>

                <label className="mt-3 block text-xs text-muted-foreground">
                  {L("vs_notes")}
                  <textarea
                    className={`${inputCls} mt-1 min-h-16`}
                    defaultValue={r.notes ?? ""}
                    onBlur={(e) => {
                      if (e.target.value !== (r.notes ?? "")) {
                        patch.mutate({ id: r.id, patch: { notes: e.target.value } });
                        toast.success(L("vs_saved"));
                      }
                    }}
                  />
                </label>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}