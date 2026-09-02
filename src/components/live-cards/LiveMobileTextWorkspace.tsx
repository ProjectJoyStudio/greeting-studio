// Mobile-only compact text-formatting workspace for the Live Card editor.
// Purely visual: it mirrors the SAME editor state and renderer used by the
// large preview and only nudges the existing design.x / design.y values.

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";

import { TextStylePanel } from "@/components/greeting-card/TextStylePanel";
import type { CardTextDesign } from "@/lib/greeting-card/types";
import { clampPosition } from "@/lib/live-cards/text-render";
import { useI18n } from "@/lib/i18n";
import { LiveVideoPreview } from "./LiveVideoPreview";

const STEP = 2;

export function LiveMobileTextWorkspace({
  videoUrl,
  text,
  design,
  ratioClass,
  onChange,
}: {
  videoUrl: string | null;
  text: string;
  design: CardTextDesign;
  ratioClass?: string;
  onChange: (patch: Partial<CardTextDesign>) => void;
}) {
  const { t } = useI18n();
  const nudge = (dx: number, dy: number) =>
    onChange(clampPosition(design.x + dx * STEP, design.y + dy * STEP, design.width));

  return (
    <div className="sm:hidden">
      <div className="flex gap-3">
        <div className="sticky top-20 w-[43%] shrink-0 self-start space-y-2">
          <LiveVideoPreview
            videoUrl={videoUrl}
            text={text}
            design={design}
            ratioClass={ratioClass}
            className="!rounded-xl"
            onMove={(pos) => onChange(pos)}
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
              {Math.round(design.x)}/{Math.round(design.y)}
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
