import { User } from "lucide-react";

/**
 * The photo confirmed on the first page, always shown next to the participant
 * it belongs to, so the person editing always sees who they are working on.
 */
export function ParticipantAvatar({
  photoUrl,
  label,
  size = "md",
}: {
  photoUrl: string | null;
  label: string;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  return (
    <span
      className={`${box} inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-muted/50`}
    >
      {photoUrl ? (
        <img src={photoUrl} alt={label} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <User className="h-4 w-4 text-muted-foreground" />
      )}
    </span>
  );
}
