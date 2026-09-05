import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen } from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { useI18n } from "@/lib/i18n";
import {
  getMemoryBookAccess,
  type MemoryBookProject,
} from "@/lib/memory-book/packages.functions";

export const Route = createFileRoute("/memory-book-create")({
  validateSearch: (search: Record<string, unknown>) => ({
    book: typeof search.book === "string" ? search.book : "",
  }),
  head: () => ({
    meta: [
      { title: "Create your Memory Book — Project Joy" },
      {
        name: "description",
        content: "Creation area for a purchased Project Joy Book of Memories and Greetings.",
      },
      { property: "og:title", content: "Create your Memory Book — Project Joy" },
      {
        property: "og:description",
        content: "Creation area for a purchased Project Joy Book of Memories and Greetings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MemoryBookCreatePage,
});

/** Small local helper: the shared dictionary stores plain strings. */
function fill(text: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (out, [key, value]) => out.replaceAll(`{${key}}`, String(value)),
    text,
  );
}

function MemoryBookCreatePage() {
  const { t } = useI18n();
  const { book: bookId } = Route.useSearch();
  const navigate = useNavigate();
  const checkAccess = useServerFn(getMemoryBookAccess);
  const [state, setState] = useState<"checking" | "allowed" | "denied">("checking");
  const [book, setBook] = useState<MemoryBookProject | null>(null);

  // A new Memory Book can only be opened when it was really paid for.
  useEffect(() => {
    let active = true;
    if (!bookId) {
      setState("denied");
      return;
    }
    checkAccess({ data: { bookId } })
      .then((res) => {
        if (!active) return;
        if (res.allowed && res.book) {
          setBook(res.book);
          setState("allowed");
        } else {
          setState("denied");
        }
      })
      .catch(() => {
        if (active) setState("denied");
      });
    return () => {
      active = false;
    };
  }, [bookId, checkAccess]);

  useEffect(() => {
    if (state !== "denied") return;
    const timer = setTimeout(() => {
      void navigate({ to: "/memory-book-packages" });
    }, 1500);
    return () => clearTimeout(timer);
  }, [state, navigate]);

  return (
    <SiteLayout>
      <PageHeader eyebrow={t("brand")} title={t("mbp_access_title")}>
        <Breadcrumbs
          items={[
            { label: t("bc_home"), to: "/" },
            { label: t("gift_memory_book"), to: "/memory-book" },
            { label: t("mbp_access_title") },
          ]}
        />
      </PageHeader>

      <section className="mx-auto w-full max-w-3xl px-4 pb-16 sm:px-6">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/70 bg-card p-8 text-center">
          <BookOpen className="h-8 w-8 text-primary" aria-hidden />
          {state === "checking" ? (
            <p className="text-sm text-muted-foreground">{t("mb_admin_loading")}</p>
          ) : state === "allowed" && book ? (
            <>
              <p className="font-display text-lg font-semibold">
                {fill(t("mbp_book_summary"), {
                  l: book.leaves,
                  p: book.internalPages,
                  v: book.videoCapacity,
                })}
              </p>
              <p className="text-sm text-muted-foreground">{t("mbp_access_prepared")}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t("mbp_access_denied")}</p>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
