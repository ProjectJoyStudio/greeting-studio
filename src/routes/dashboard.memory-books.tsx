import { useCallback, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Plus } from "lucide-react";

import { DashboardPageHeader } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useCreditBalance } from "@/lib/credits/useCreditBalance";
import {
  extendMemoryBookStorage,
  listMemoryBooks,
  type MemoryBookProject,
} from "@/lib/memory-book/packages.functions";

export const Route = createFileRoute("/dashboard/memory-books")({
  component: MyMemoryBooksPage,
});

function fill(text: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (out, [key, value]) => out.replaceAll(`{${key}}`, String(value)),
    text,
  );
}

function daysLeft(expiresAt: string) {
  const end = new Date(expiresAt).getTime();
  if (!Number.isFinite(end)) return 0;
  return Math.max(0, Math.ceil((end - Date.now()) / 86_400_000));
}

function MyMemoryBooksPage() {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const fetchBooks = useServerFn(listMemoryBooks);
  const extend = useServerFn(extendMemoryBookStorage);
  const { refresh } = useCreditBalance();

  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // One stable key per book + option, so a repeated click never charges twice.
  const keys = useRef<Record<string, string>>({});
  const keyFor = useCallback((id: string) => {
    const existing = keys.current[id];
    if (existing) return existing;
    const generated =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    keys.current[id] = generated;
    return generated;
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["my-memory-books"],
    queryFn: () => fetchBooks({ data: undefined }),
  });

  const books: MemoryBookProject[] = data?.books ?? [];

  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleDateString(lang) : "—";
  };

  async function runExtend(book: MemoryBookProject, days: 7 | 30) {
    if (busy) return;
    setNotice(null);
    setBusy(`${book.id}-${days}`);
    try {
      const res = await extend({
        data: { bookId: book.id, days, extendKey: `${keyFor(`${book.id}-${days}`)}` },
      });
      if (res.ok) {
        keys.current[`${book.id}-${days}`] = "";
        delete keys.current[`${book.id}-${days}`];
        setNotice(t("mbd_extended"));
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["my-memory-books"] }),
          refresh(),
        ]);
      } else {
        setNotice(
          res.error === "insufficient_credits" ? t("mbd_err_credits") : t("mbd_err_failed"),
        );
      }
    } catch {
      setNotice(t("mbd_err_failed"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <DashboardPageHeader titleKey="mbd_title" subtitleKey="mbd_sub" />

      <div className="mb-6">
        <Button asChild>
          <Link to="/memory-book-packages">
            <Plus className="mr-2 h-4 w-4" />
            {t("mbd_create_another")}
          </Link>
        </Button>
      </div>

      {notice && <p className="mb-4 text-sm text-muted-foreground">{notice}</p>}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("mb_admin_loading")}</p>
      ) : books.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("mbd_empty")}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {books.map((book) => {
            const left = daysLeft(book.expiresAt);
            return (
              <li
                key={book.id}
                className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <BookOpen className="mt-1 h-5 w-5 text-primary" aria-hidden />
                  <div className="min-w-0">
                    <p className="font-display text-base font-semibold">
                      {fill(t("mbp_book_summary"), {
                        l: book.leaves,
                        p: book.internalPages,
                        v: book.videoCapacity,
                      })}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("mbd_started")}: {formatDate(book.createdAt)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("mbd_expires")}: {formatDate(book.expiresAt)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {left > 0 ? fill(t("mbd_remaining"), { n: left }) : t("mbd_expired")}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {fill(t("mbd_spent"), { n: book.creditsSpent })}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link to="/memory-book-create" search={{ book: book.id }}>
                      {t("mbd_continue")}
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy !== null}
                    onClick={() => void runExtend(book, 7)}
                  >
                    {busy === `${book.id}-7` ? t("mbd_working") : t("mbd_extend_week")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy !== null}
                    onClick={() => void runExtend(book, 30)}
                  >
                    {busy === `${book.id}-30` ? t("mbd_working") : t("mbd_extend_month")}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
