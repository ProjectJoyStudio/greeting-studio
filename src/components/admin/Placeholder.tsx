import { Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function AdminPlaceholder({ titleKey }: { titleKey: string }) {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <h1 className="font-[Fraunces] text-3xl font-semibold text-foreground">{t(titleKey)}</h1>
      <div className="rounded-2xl border border-dashed border-border/70 bg-card/60 p-10 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-primary/70" />
        <h2 className="mt-4 font-[Fraunces] text-xl font-semibold text-foreground">
          {t("admin_placeholder_module_title")}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {t("admin_placeholder_module_body")}
        </p>
      </div>
    </div>
  );
}
