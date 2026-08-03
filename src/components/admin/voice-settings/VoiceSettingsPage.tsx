import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FlaskConical, Loader2, Mic2 } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import {
  listVoiceModels,
  setProductionVoiceModel,
  setVoiceModelStatus,
  voiceModelStats,
} from "@/lib/admin/voice-settings/store";
import { VOICE_PROVIDERS, providerLabel } from "@/lib/admin/voice-settings/types";
import type { VoiceModelRow } from "@/lib/admin/voice-settings/types";

import { useLocal } from "./i18n";

const btn =
  "rounded-md border border-border/60 bg-background px-3 py-1.5 text-xs text-foreground transition hover:bg-muted/50 disabled:opacity-50";

function StatusBadge({ status, L }: { status: string; L: (k: string) => string }) {
  const map: Record<string, { dot: string; label: string; hint: string }> = {
    production: { dot: "bg-emerald-500", label: L("vs_status_production"), hint: L("vs_status_production_hint") },
    testing: { dot: "bg-amber-500", label: L("vs_status_testing"), hint: L("vs_status_testing_hint") },
    disabled: { dot: "bg-muted-foreground/50", label: L("vs_status_disabled"), hint: L("vs_status_disabled_hint") },
  };
  const s = map[status] ?? map["testing"]!;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-2.5 py-1 text-xs font-medium">
        <span className={`h-2 w-2 rounded-full ${s.dot}`} />
        {s.label}
      </span>
      <span className="text-[11px] text-muted-foreground">{s.hint}</span>
    </div>
  );
}

export function VoiceSettingsPage() {
  const { lang } = useI18n();
  const L = useLocal(lang);
  const qc = useQueryClient();

  const models = useQuery({ queryKey: ["voice-models"], queryFn: listVoiceModels });
  const stats = useQuery({ queryKey: ["voice-model-stats"], queryFn: voiceModelStats });

  const promote = useMutation({
    mutationFn: (id: string) => setProductionVoiceModel(id),
    onSuccess: () => {
      toast.success(L("vs_production_done"));
      void qc.invalidateQueries({ queryKey: ["voice-models"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changeStatus = useMutation({
    mutationFn: (v: { id: string; status: "testing" | "disabled" }) => setVoiceModelStatus(v.id, v.status),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["voice-models"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const rows: VoiceModelRow[] = models.data ?? [];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[Fraunces] text-2xl font-semibold text-foreground">{L("vs_title")}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{L("vs_sub")}</p>
        </div>
        <Link
          to="/admin/voice-settings/testing"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition hover:opacity-90"
        >
          <FlaskConical className="h-4 w-4" /> {L("vs_testing_link")}
        </Link>
      </header>

      <section className="rounded-2xl border border-border/60 bg-card/80 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Mic2 className="h-4 w-4" /> {L("vs_models")}
        </h2>
        {models.isLoading ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {rows.map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/60 bg-background px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    {m.label}
                    {m.status === "production" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {providerLabel(m.provider)} · {m.model_key}
                  </p>
                  {m.description && <p className="mt-1 text-xs text-muted-foreground">{m.description}</p>}
                </div>
                <StatusBadge status={m.status} L={L} />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
                    disabled={m.status === "production" || promote.isPending}
                    onClick={() => promote.mutate(m.id)}
                  >
                    {L("vs_make_production")}
                  </button>
                  {m.status !== "production" && (
                    <button
                      type="button"
                      className={btn}
                      onClick={() =>
                        changeStatus.mutate({
                          id: m.id,
                          status: m.status === "disabled" ? "testing" : "disabled",
                        })
                      }
                    >
                      {m.status === "disabled" ? L("vs_enable_testing") : L("vs_disable")}
                    </button>
                  )}
                  <Link
                    to="/admin/voice-settings/testing"
                    search={{ model: m.id }}
                    className={`${btn} inline-flex items-center gap-1.5`}
                  >
                    <FlaskConical className="h-3.5 w-3.5" /> {L("vs_test_this")}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border/60 bg-card/80 p-5">
        <h2 className="text-sm font-semibold text-foreground">{L("vs_stats")}</h2>
        {(stats.data ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{L("vs_no_stats")}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">{L("vs_model")}</th>
                  <th className="py-2 pr-3">{L("vs_stat_total")}</th>
                  <th className="py-2 pr-3">{L("vs_stat_ok")}</th>
                  <th className="py-2 pr-3">{L("vs_stat_failed")}</th>
                  <th className="py-2 pr-3">{L("vs_stat_avg_ms")}</th>
                  <th className="py-2 pr-3">{L("vs_stat_chars")}</th>
                  <th className="py-2 pr-3">{L("vs_stat_avg_chars")}</th>
                  <th className="py-2 pr-3">{L("vs_stat_avg_duration")}</th>
                  <th className="py-2 pr-3">{L("vs_stat_avg_credits")}</th>
                  <th className="py-2 pr-3">{L("vs_stat_total_credits")}</th>
                  <th className="py-2 pr-3">{L("vs_stat_avg_cost")}</th>
                </tr>
              </thead>
              <tbody>
                {(stats.data ?? []).map((s) => (
                  <tr key={`${s.provider}-${s.model_key}`} className="border-t border-border/50">
                    <td className="py-2 pr-3">
                      {rows.find((m) => m.model_key === s.model_key)?.label ?? s.model_key}
                    </td>
                    <td className="py-2 pr-3">{s.total}</td>
                    <td className="py-2 pr-3 text-emerald-600">{s.succeeded}</td>
                    <td className="py-2 pr-3 text-rose-600">{s.failed}</td>
                    <td className="py-2 pr-3">{Math.round(Number(s.avg_generation_ms ?? 0))} ms</td>
                    <td className="py-2 pr-3">{s.total_characters}</td>
                    <td className="py-2 pr-3">{Math.round(Number(s.avg_characters ?? 0))}</td>
                    <td className="py-2 pr-3">{Number(s.avg_duration_seconds ?? 0).toFixed(2)} s</td>
                    <td className="py-2 pr-3">{Number(s.avg_credits ?? 0).toFixed(1)}</td>
                    <td className="py-2 pr-3">{Number(s.total_credits ?? 0).toFixed(1)}</td>
                    <td className="py-2 pr-3">${Number(s.avg_cost_usd ?? 0).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted-foreground">{L("vs_stat_cost_note")}</p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border/60 bg-card/80 p-5">
        <h2 className="text-sm font-semibold text-foreground">{L("vs_providers")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {VOICE_PROVIDERS.map((p) => (
            <div key={p.id} className="rounded-xl border border-border/60 bg-background px-4 py-3">
              <div className="text-sm font-medium text-foreground">{p.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {p.available ? L("vs_provider_ready") : L("vs_provider_planned")}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}