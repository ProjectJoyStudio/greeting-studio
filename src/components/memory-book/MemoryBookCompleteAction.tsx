import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/lib/i18n";
import { completeMemoryBook } from "@/lib/memory-book/lifecycle.functions";

/**
 * The final action of ONE Memory Book: the customer says the book is finished.
 * Editing and autosave are untouched — this only moves the saved book from a
 * draft to a finished book in the customer's cabinet.
 */
export function MemoryBookCompleteAction({
  bookId,
  alreadyCompleted,
}: {
  bookId: string;
  alreadyCompleted: boolean;
}) {
  const { t } = useI18n();
  const complete = useServerFn(completeMemoryBook);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(alreadyCompleted);
  const [error, setError] = useState<string | null>(null);
  // Guards against a second request while one is already on its way.
  const running = useRef(false);

  async function runComplete() {
    if (running.current || done) return;
    running.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await complete({ data: { bookId, method: "cabinet" } });
      if (res.ok) {
        setDone(true);
        setOpen(false);
      } else {
        setError(t("mbc_failed"));
      }
    } catch {
      setError(t("mbc_failed"));
    } finally {
      setBusy(false);
      running.current = false;
    }
  }

  if (done) {
    return (
      <div className="mt-8 space-y-3 rounded-2xl border border-border/70 bg-card p-5 text-left">
        <p className="inline-flex items-center gap-2 font-display text-lg font-semibold">
          <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />
          {t("mbc_done_title")}
        </p>
        <p className="text-sm text-muted-foreground">{t("mbc_done_text")}</p>
        <Button asChild size="sm">
          <Link to="/dashboard/memory-books">{t("mbc_go_cabinet")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-3 rounded-2xl border border-border/70 bg-card p-5 text-left">
      <p className="text-sm text-muted-foreground">{t("mbc_hint")}</p>
      <Button onClick={() => setOpen(true)} disabled={busy}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
        {busy ? t("mbc_working") : t("mbc_action")}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <AlertDialog open={open} onOpenChange={(next) => (busy ? null : setOpen(next))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("mbc_confirm_title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("mbc_confirm_text")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t("mbc_cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                void runComplete();
              }}
            >
              {busy ? t("mbc_working") : t("mbc_confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
