import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, RefreshCw, Trash2, Mic2 } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import {
  adminDeleteVoice,
  adminFillPreviews,
  adminImportVoices,
  adminListVoices,
  adminRegeneratePreview,
  adminUpdateVoice,
} from "@/lib/voice-library/library.functions";
import { PREVIEW_LANGUAGES, type LibraryVoice } from "@/lib/voice-library/types";

import { useLocal } from "./i18n";

const btn =
  "rounded-md border border-border/60 bg-background px-3 py-1.5 text-xs text-foreground transition hover:bg-muted/50 disabled:opacity-50";
const field =
  "w-full rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-xs text-foreground";

function VoiceCard({
  voice,
  L,
  onChanged,
}: {
  voice: LibraryVoice;
  L: (k: string) => string;
  onChanged: () => void;
}) {
  const update = useServerFn(adminUpdateVoice);
  const regenerate = useServerFn(adminRegeneratePreview);
  const remove = useServerFn(adminDeleteVoice);

  const [displayName, setDisplayName] = useState(voice.displayName);
  const [description, setDescription] = useState(voice.description);
  const [gender, setGender] = useState(voice.gender || "");
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, action: () => Promise<unknown>, message: string) {
    setBusy(key);
    try {
      await action();
      toast.success(message);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border border-border/60 bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{voice.displayName || voice.name}</p>
          <p className="text-xs text-muted-foreground">
            {voice.provider} · {L("vl_voice_id")}: {voice.externalVoiceId}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {L("vl_category")}: {voice.category || "—"} · {L("vl_gender")}: {voice.gender || "—"} ·{" "}
            {L("vs_language")}: {(voice.language || "—").toUpperCase()}
          </p>
          {voice.modelCompatibility.length > 0 && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {L("vl_models")}: {voice.modelCompatibility.join(", ")}
            </p>
          )}
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {L("vl_imported")}: {new Date(voice.importedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1 text-xs font-medium ${
              voice.isActive ? "text-emerald-700" : "text-muted-foreground"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${voice.isActive ? "bg-emerald-500" : "bg-muted-foreground/50"}`}
            />
            {voice.isActive ? L("vl_active") : L("vl_inactive")}
          </span>
          <button
            type="button"
            className={btn}
            disabled={busy !== null}
            onClick={() =>
              void run(
                "active",
                () => update({ data: { voiceId: voice.id, isActive: !voice.isActive } }),
                L("vl_saved"),
              )
            }
          >
            {voice.isActive ? L("vl_disable") : L("vl_enable")}
          </button>
          <button
            type="button"
            className={`${btn} text-rose-600`}
            disabled={busy !== null}
            onClick={() => {
              if (!window.confirm(L("vl_delete_confirm"))) return;
              void run("delete", () => remove({ data: { voiceId: voice.id } }), L("vl_deleted"));
            }}
          >
            <Trash2 className="mr-1 inline h-3.5 w-3.5" />
            {L("vl_delete")}
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <label className="text-[11px] text-muted-foreground">
          {L("vl_display_name")}
          <input className={field} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </label>
        <label className="text-[11px] text-muted-foreground sm:col-span-1">
          {L("vl_gender")}
          <select className={field} value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">—</option>
            <option value="female">female</option>
            <option value="male">male</option>
            <option value="children">children</option>
            <option value="neutral">neutral</option>
          </select>
        </label>
        <label className="text-[11px] text-muted-foreground">
          {L("vl_description")}
          <input className={field} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
      </div>
      <button
        type="button"
        className={`${btn} mt-2`}
        disabled={busy !== null}
        onClick={() =>
          void run(
            "save",
            () => update({ data: { voiceId: voice.id, displayName, description, gender } }),
            L("vl_saved"),
          )
        }
      >
        {L("vl_save")}
      </button>

      <div className="mt-4">
        <p className="text-xs font-medium text-foreground">{L("vl_previews")}</p>
        {voice.previews.length === 0 && (
          <p className="mt-1 text-xs text-muted-foreground">{L("vl_no_previews")}</p>
        )}
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {PREVIEW_LANGUAGES.map((code) => {
            const preview = voice.previews.find((p) => p.language === code);
            return (
              <div
                key={code}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border/50 px-3 py-2"
              >
                <span className="text-xs font-medium uppercase">{code}</span>
                {preview?.audioUrl ? (
                  <audio src={preview.audioUrl} controls preload="none" className="h-8 max-w-[220px]" />
                ) : (
                  <span className="text-[11px] text-muted-foreground">{L("vl_no_previews")}</span>
                )}
                <button
                  type="button"
                  className={btn}
                  disabled={busy !== null}
                  onClick={() =>
                    void run(
                      `p-${code}`,
                      () => regenerate({ data: { voiceId: voice.id, language: code } }),
                      L("vl_preview_done"),
                    )
                  }
                >
                  {busy === `p-${code}` ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    L("vl_regenerate")
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function VoiceLibraryPage() {
  const { lang } = useI18n();
  const L = useLocal(lang);
  const qc = useQueryClient();

  const list = useServerFn(adminListVoices);
  const importVoices = useServerFn(adminImportVoices);
  const fill = useServerFn(adminFillPreviews);

  const voices = useQuery({ queryKey: ["voice-library"], queryFn: () => list({ data: undefined }) });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["voice-library"] });

  const runImport = useMutation({
    mutationFn: () => importVoices({ data: { withPreviews: true } }),
    onSuccess: (res) => {
      toast.success(`${L("vl_import_done")} · ${res.imported} · +${res.previewsCreated}`);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const runFill = useMutation({
    mutationFn: () => fill({ data: {} }),
    onSuccess: (res) => {
      toast.success(`${L("vl_preview_done")} · ${res.checked} · +${res.repaired}`);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = voices.data?.voices ?? [];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[Fraunces] text-2xl font-semibold text-foreground">{L("vl_title")}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{L("vl_sub")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/voice-settings" className={btn}>
            {L("vs_back")}
          </Link>
          <button
            type="button"
            className={btn}
            disabled={runFill.isPending || runImport.isPending}
            onClick={() => runFill.mutate()}
          >
            {runFill.isPending ? (
              <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 inline h-3.5 w-3.5" />
            )}
            {L("vl_fill")}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            disabled={runImport.isPending}
            onClick={() => runImport.mutate()}
          >
            {runImport.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {runImport.isPending ? L("vl_importing") : L("vl_import")}
          </button>
        </div>
      </header>

      <p className="rounded-xl border border-border/60 bg-card/60 px-4 py-3 text-xs text-muted-foreground">
        {L("vl_credit_note")}
      </p>

      <section className="rounded-2xl border border-border/60 bg-card/80 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Mic2 className="h-4 w-4" /> {L("vl_title")}
        </h2>
        {voices.isLoading ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </p>
        ) : rows.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{L("vl_empty")}</p>
        ) : (
          <div className="mt-4 space-y-3">
            {rows.map((voice) => (
              <VoiceCard key={voice.id} voice={voice} L={L} onChanged={refresh} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}