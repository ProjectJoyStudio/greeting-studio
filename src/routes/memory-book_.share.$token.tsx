import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { MemoryBookBook } from "@/components/memory-book/MemoryBookBook";
import type { MemoryBookBookData } from "@/components/memory-book/MemoryBookBook";
import { Button } from "@/components/ui/button";
import { loadSharedMemoryBook } from "@/lib/memory-book/share.functions";

export const Route = createFileRoute("/memory-book_/share/$token")({
  head: () => ({
    meta: [
      { title: "A Memory Book for you — Project Joy" },
      { name: "description", content: "Turn the pages of a Book of Memories and Greetings shared with you." },
      { property: "og:title", content: "A Memory Book for you — Project Joy" },
      { property: "og:description", content: "Turn the pages of a Book of Memories and Greetings shared with you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: SharedMemoryBookPage,
});

function SharedMemoryBookPage() {
  const { t } = useI18n();
  const { token } = Route.useParams();
  const load = useServerFn(loadSharedMemoryBook);
  const [state, setState] = useState<"loading" | "ok" | "denied" | "error">("loading");
  const [reload, setReload] = useState(0);
  const [book, setBook] = useState<MemoryBookBookData | null>(null);

  useEffect(() => {
    let alive = true;
    setState("loading");
    load({ data: { token } })
      .then((res) => {
        if (!alive) return;
        if (res.ok && res.book) {
          setBook(res.book);
          setState("ok");
        } else setState("denied");
      })
      .catch(() => alive && setState("error"));
    return () => {
      alive = false;
    };
  }, [token, load, reload]);

  // Reserve the scrollbar's space so a scrollbar appearing near the end of
  // the book does not change the reading width.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.scrollbarGutter;
    root.style.scrollbarGutter = "stable";
    return () => {
      root.style.scrollbarGutter = previous;
    };
  }, []);

  return (
    <main className="min-h-screen bg-background px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <p className="text-center font-display text-lg font-semibold text-primary">Project Joy</p>
        {state === "loading" ? (
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t("mbpv_loading")}
          </p>
        ) : state === "ok" && book ? (
          <MemoryBookBook data={book} />
        ) : state === "error" ? (
          <div className="text-center text-sm text-muted-foreground" role="alert">
            <p>{t("mbpv_load_error")}</p>
            <Button variant="outline" className="mt-3" onClick={() => setReload(n => n + 1)}>{t("mbpv_retry")}</Button>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground">{t("mbs_unavailable")}</p>
        )}
      </div>
    </main>
  );
}
