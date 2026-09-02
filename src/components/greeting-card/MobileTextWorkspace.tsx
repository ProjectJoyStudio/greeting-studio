// Mobile-only compact text-formatting workspace for the Greeting Card editor.
// Purely visual: it mirrors the SAME editor state/renderer used by the large
// preview and only nudges the existing design.x / design.y values.

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import type { CardTextDesign } from "@/lib/greeting-card/types";
import { useI18n } from "@/lib/i18n";
import { CardPreview } from "./CardPreview";
import { TextStylePanel } from "./TextStylePanel";

const STEP = 2;
const MIN = 5;
const MAX = 95;
const clamp = (n: number) => Math.min(MAX, Math.max(MIN, n));

export function MobileTextWorkspace({
  imageUrl,
  text,
  design,
  onChange,
}: {
  imageUrl: string | null;
  text: string;
  design: CardTextDesign;
  onChange: (patch: Partial<CardTextDesign>) => void;
}) {
  const { t } = useI18n();
  const nudge = (dx: number, dy: number) =>
    onChange({ x: clamp(design.x + dx * STEP), y: clamp(design.y + dy * STEP) });

  return (
    <div className="sm:hidden">
      <div className="flex gap-3">
        <div className="sticky top-20 w-[43%] shrink-0 self-start space-y-2">
          <CardPreview
            imageUrl={imageUrl}
            text={text}
            design={design}
            alt={t("gc_preview_alt")}
            className="!rounded-xl"
          />
          <div className="grid grid-cols-3 gap-1">
            <span />
            <PadButton label={t("gc_pos_y")} onPress={() => nudge(0, -1)}>
              <ChevronUp className="h-4 w-4" />
            </PadButton>
            <span />
            <PadButton label={t("gc_pos_x")} onPress={() => nudge(-1, 0)}>
              <ChevronLeft className="h-4 w-4" />
            </PadButton>
            <span className="grid place-items-center text-[10px] tabular-nums text-muted-foreground">
              {design.x}/{design.y}
            </span>
            <PadButton label={t("gc_pos_x")} onPress={() => nudge(1, 0)}>
              <ChevronRight className="h-4 w-4" />
            </PadButton>
            <span />
            <PadButton label={t("gc_pos_y")} onPress={() => nudge(0, 1)}>
              <ChevronDown className="h-4 w-4" />
            </PadButton>
            <span />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <TextStylePanel design={design} onChange={onChange} />
        </div>
      </div>
    </div>
  );
}

function PadButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onPress}
      className="grid h-9 place-items-center rounded-lg border border-border/60 bg-background text-foreground active:bg-secondary"
    >
      {children}
    </button>
  );
}
