import { useState } from "react";
import { useI18n } from "@/lib/i18n";

/** A failed photo is local to its slot, never a full-reader exception. */
export function ViewerImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const { t } = useI18n();
  const [failed, setFailed] = useState<string | null>(null);
  if (failed === props.src) return (
    <span role="status" className="absolute inset-0 flex items-center justify-center bg-muted p-2 text-center text-xs text-muted-foreground">
      {t("mbpv_media_error")}
    </span>
  );
  return <img {...props} onError={() => setFailed(props.src ?? "")} />;
}