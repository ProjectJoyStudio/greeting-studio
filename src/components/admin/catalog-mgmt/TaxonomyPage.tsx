import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

import { useCatalogMgmt } from "@/lib/admin/catalog-mgmt/store";
import { LANGS, useI18n } from "@/lib/i18n";
import type { TaxonomyItem, TaxonomyKind } from "@/lib/admin/catalog-mgmt/types";
import { Section, useConfirm } from "./shared";

const KINDS: TaxonomyKind[] = ["occasion", "recipient", "style", "mood", "visualObject", "ageGroup", "orientation"];

export function TaxonomyPage() {
  const { taxonomy, addTaxonomy, updateTaxonomy, deleteTaxonomy, reorderTaxonomy, taxonomyUsage, t } = useCatalogMgmt();
  const { lang } = useI18n();
  const [kind, setKind] = useState<TaxonomyKind>("occasion");
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const { ask, dialog } = useConfirm();
  const list = taxonomy[kind];

  function move(idx: number, dir: -1 | 1) {
    const next = list.map((i) => i.key);
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    reorderTaxonomy(kind, next);
  }

  function add() {
    if (!newKey.trim() || !newLabel.trim()) return;
    const item: TaxonomyItem = {
      key: newKey.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_"),
      names: { en: newLabel.trim() },
      displayOrder: list.length + 1,
      active: true,
    };
    if (list.some((i) => i.key === item.key)) {
      toast.error(item.key + " exists");
      return;
    }
    addTaxonomy(kind, item);
    setNewKey("");
    setNewLabel("");
    toast.success(t("cm_saved"));
  }

  return (
    <div className="space-y-4">
      {dialog}
      <Section title={t("cm_tx_title")} description={t("cm_tx_subtitle")}>
        <div className="flex flex-wrap gap-1">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded-full border px-3 py-1.5 text-xs ${
                kind === k ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(`cm_tx_kind_${k}`)}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t("cm_tx_add")}>
        <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
          <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder={t("cm_tx_key")} className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/60" />
          <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Label (EN)" className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/60" />
          <button type="button" onClick={add} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            <Plus className="h-4 w-4" /> {t("cm_tx_add")}
          </button>
        </div>
      </Section>

      <Section title={t(`cm_tx_kind_${kind}`)}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-2 py-2">{t("cm_tx_key")}</th>
                <th className="px-2 py-2">{t("cm_tx_names")}</th>
                <th className="px-2 py-2">{t("cm_tx_icon")}</th>
                <th className="px-2 py-2">{t("cm_tx_active")}</th>
                <th className="px-2 py-2">{t("cm_tx_usage")}</th>
                <th className="px-2 py-2">{t("cm_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((it, idx) => {
                const usage = taxonomyUsage(kind, it.key);
                return (
                  <tr key={it.key} className="border-t border-border/60">
                    <td className="px-2 py-2 font-mono text-xs">{it.key}</td>
                    <td className="px-2 py-2">
                      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                        {LANGS.map((l) => (
                          <input
                            key={l.code}
                            value={it.names[l.code] ?? ""}
                            onChange={(e) => updateTaxonomy(kind, it.key, { names: { ...it.names, [l.code]: e.target.value } })}
                            placeholder={l.flag}
                            className="w-full rounded border border-border/60 bg-background px-2 py-1 text-xs outline-none focus:border-primary/60"
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        value={it.icon ?? ""}
                        onChange={(e) => updateTaxonomy(kind, it.key, { icon: e.target.value })}
                        className="w-16 rounded border border-border/60 bg-background px-2 py-1 text-sm outline-none focus:border-primary/60"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input type="checkbox" checked={it.active} onChange={(e) => updateTaxonomy(kind, it.key, { active: e.target.checked })} />
                    </td>
                    <td className="px-2 py-2 tabular-nums">{usage}</td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => move(idx, -1)} className="rounded border border-border/60 bg-background p-1 hover:bg-muted/50" aria-label="Up"><ArrowUp className="h-3 w-3" /></button>
                        <button type="button" onClick={() => move(idx, 1)} className="rounded border border-border/60 bg-background p-1 hover:bg-muted/50" aria-label="Down"><ArrowDown className="h-3 w-3" /></button>
                        <button
                          type="button"
                          onClick={() =>
                            ask(t("cm_confirm_delete"), () => {
                              const res = deleteTaxonomy(kind, it.key);
                              if (!res.ok) toast.error(`${t("cm_confirm_delete_used")} (${res.usage})`);
                              else toast.success(t("cm_deleted"));
                            }, t("cm_confirm_delete_used"))
                          }
                          className="rounded border border-destructive/40 bg-destructive/10 p-1 text-destructive hover:bg-destructive/20"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}