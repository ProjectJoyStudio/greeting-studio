import type { CardTextDesign } from "@/lib/greeting-card/types";

/** Shared renderer: artwork plus the greeting, exactly as the final card looks. */
export function CardPreview({
  imageUrl,
  text,
  design,
  className = "",
  alt,
}: {
  imageUrl: string | null;
  text: string;
  design: CardTextDesign;
  className?: string;
  alt: string;
}) {
  return (
    <div
      className={`relative aspect-square w-full overflow-hidden rounded-2xl bg-muted ${className}`}
      style={{ containerType: "inline-size" }}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={alt} className="h-full w-full object-cover" crossOrigin="anonymous" />
      ) : null}
      {text.trim() ? (
        <div
          className="absolute"
          style={{
            left: `${design.x}%`,
            top: `${design.y}%`,
            width: `${design.width}%`,
            transform: "translate(-50%, -50%)",
            textAlign: design.align,
            color: design.color,
            fontFamily: design.fontFamily,
            fontSize: `${design.fontSize}cqw`,
            lineHeight: 1.25,
            whiteSpace: "pre-wrap",
            textShadow: design.shadow ? "0 2px 10px rgba(0,0,0,0.55)" : undefined,
            background: design.background
              ? hexToRgba(design.backgroundColor, design.backgroundOpacity)
              : undefined,
            padding: design.background ? "0.6em 0.8em" : undefined,
            borderRadius: design.background ? "0.6em" : undefined,
          }}
        >
          {text}
        </div>
      ) : null}
    </div>
  );
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const n = Number.parseInt(full || "000000", 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}