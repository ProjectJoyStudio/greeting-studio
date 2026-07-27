// ---------------------------------------------------------------------------
// Public-facing greeting text. Uses the exact same layout engine and renderer
// as the admin preview and the exported image — no safe-area guides.
// ---------------------------------------------------------------------------

import type { TextDesign } from "@/lib/admin/catalog-mgmt/types";
import { defaultTextDesign } from "@/lib/admin/catalog-mgmt/types";
import type { PublicTextDesignRow } from "@/lib/public-catalog.functions";
import { refHeightFor } from "@/lib/text-fit/engine";
import { CardTextLayer } from "./CardTextLayer";

function toDesign(row: PublicTextDesignRow): TextDesign {
  return {
    x: Number(row.text_x),
    y: Number(row.text_y),
    width: Number(row.text_width),
    alignment: (row.alignment as TextDesign["alignment"]) ?? "center",
    fontFamily: row.font_family,
    fontSize: Number(row.font_size),
    fontWeight: row.font_weight,
    lineHeight: Number(row.line_height),
    textColor: row.text_color,
    textShadow: row.text_shadow,
    backgroundOverlay: Number(row.background_opacity),
    rotation: Number(row.rotation),
    maxLines: row.max_lines,
  };
}

export function PublicCardText({
  text,
  designs,
  lang,
  aspectRatio = "4:5",
}: {
  text: string;
  designs: PublicTextDesignRow[] | undefined;
  lang: string;
  aspectRatio?: string;
}) {
  const rows = designs ?? [];
  const baseRow = rows.find((r) => !r.language_code);
  const langRow = rows.find((r) => r.language_code === lang);
  const base = baseRow ? toDesign(baseRow) : defaultTextDesign();
  const design = langRow ? toDesign(langRow) : base;
  return (
    <CardTextLayer
      text={text}
      design={design}
      autoFit={!langRow}
      refHeight={refHeightFor(aspectRatio)}
    />
  );
}