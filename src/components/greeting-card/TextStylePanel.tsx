import { CARD_FONTS, type CardTextDesign } from "@/lib/greeting-card/types";
import { useI18n } from "@/lib/i18n";

export function TextStylePanel({
  design,
  onChange,
}: {
  design: CardTextDesign;
  onChange: (patch: Partial<CardTextDesign>) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Row label={t("gc_font")}>
        <select
          value={design.fontFamily}
          onChange={(e) => onChange({ fontFamily: e.target.value })}
          className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
        >
          {CARD_FONTS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </Row>
      <Row label={`${t("gc_font_size")} — ${design.fontSize.toFixed(1)}`}>
        <input
          type="range" min={2} max={14} step={0.25} value={design.fontSize}
          onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
          className="w-full"
        />
      </Row>
      <Row label={t("gc_font_color")}>
        <input
          type="color" value={design.color}
          onChange={(e) => onChange({ color: e.target.value })}
          className="h-10 w-full rounded-lg border border-border/60 bg-background"
        />
      </Row>
      <Row label={t("gc_align")}>
        <div className="flex gap-1">
          {(["left", "center", "right"] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => onChange({ align: a })}
              className={`flex-1 rounded-lg border px-2 py-2 text-xs capitalize ${
                design.align === a
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border/60 bg-background text-muted-foreground"
              }`}
            >
              {t(`gc_align_${a}`)}
            </button>
          ))}
        </div>
      </Row>
      <Row label={`${t("gc_pos_x")} — ${design.x}%`}>
        <input type="range" min={5} max={95} value={design.x}
          onChange={(e) => onChange({ x: Number(e.target.value) })} className="w-full" />
      </Row>
      <Row label={`${t("gc_pos_y")} — ${design.y}%`}>
        <input type="range" min={5} max={95} value={design.y}
          onChange={(e) => onChange({ y: Number(e.target.value) })} className="w-full" />
      </Row>
      <Row label={`${t("gc_text_width")} — ${design.width}%`}>
        <input type="range" min={20} max={95} value={design.width}
          onChange={(e) => onChange({ width: Number(e.target.value) })} className="w-full" />
      </Row>
      <Row label={t("gc_effects")}>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={design.shadow}
              onChange={(e) => onChange({ shadow: e.target.checked })} />
            {t("gc_shadow")}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={design.outline}
              onChange={(e) => onChange({ outline: e.target.checked })} />
            {t("gc_outline")}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={design.background}
              onChange={(e) => onChange({ background: e.target.checked })} />
            {t("gc_text_bg")}
          </label>
        </div>
      </Row>
      {design.outline && (
        <Row label={t("gc_outline_color")}>
          <input type="color" value={design.outlineColor}
            onChange={(e) => onChange({ outlineColor: e.target.value })}
            className="h-10 w-full rounded-lg border border-border/60 bg-background" />
        </Row>
      )}
      {design.background && (
        <>
          <Row label={t("gc_text_bg_color")}>
            <input type="color" value={design.backgroundColor}
              onChange={(e) => onChange({ backgroundColor: e.target.value })}
              className="h-10 w-full rounded-lg border border-border/60 bg-background" />
          </Row>
          <Row label={`${t("gc_text_bg_opacity")} — ${Math.round(design.backgroundOpacity * 100)}%`}>
            <input type="range" min={0} max={100} value={Math.round(design.backgroundOpacity * 100)}
              onChange={(e) => onChange({ backgroundOpacity: Number(e.target.value) / 100 })}
              className="w-full" />
          </Row>
        </>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs">
      <span className="mb-1.5 block text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}