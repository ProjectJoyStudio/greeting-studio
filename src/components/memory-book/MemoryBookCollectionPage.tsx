import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Plus } from "lucide-react";

import { DashboardPageHeader } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useCreditBalance } from "@/lib/credits/useCreditBalance";
import {
  listMemoryBooks,
  type MemoryBookProject,
} from "@/lib/memory-book/packages.functions";
import {
  buildMemoryBookOfflinePlan,
  reportOfflineExportIssue,
} from "@/lib/memory-book/offline-export.functions";
import { requestOfflineSaveTarget } from "@/lib/memory-book/offline-save";
import { OFFLINE_PACKAGE_NAME } from "@/lib/memory-book/offline-package";
import { MemoryBookShareDialog } from "@/components/memory-book/MemoryBookShareDialog";
import { StorageExtensionPanel } from "@/components/memory-book/StorageExtensionPanel";
import { getStorageOffers } from "@/lib/memory-book/storage-offers.functions";
import { memoryBookCollection, type MemoryBookCollection } from "@/lib/memory-book/dashboard-classification";
import { MemoryBookDashboardNavigation } from "./MemoryBookDashboardNavigation";
import { loadMemoryBookDesigns } from "@/lib/memory-book/designs.functions";


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

export function MemoryBookCollectionPage({ collection }: { collection: MemoryBookCollection }) {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const fetchBooks = useServerFn(listMemoryBooks);
  const readOffers = useServerFn(getStorageOffers);
  const buildPlan = useServerFn(buildMemoryBookOfflinePlan);
  const reportIssue = useServerFn(reportOfflineExportIssue);
  const [stage, setStage] = useState<string>("preparing");
  const { refresh } = useCreditBalance();

  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [percent, setPercent] = useState(0);
  const [sharing, setSharing] = useState<string | null>(null);

  /**
   * Prepares and saves the offline copy of ONE completed book. It only reads
   * the book: nothing is stored on Project Joy and nothing is changed.
   */
  function runDownload(book: MemoryBookProject) {
    if (busy) return;
    // MUST stay first and synchronous: the browser only opens the "Save as"
    // dialog while it is still handling this click.
    const targetPromise = requestOfflineSaveTarget(`${OFFLINE_PACKAGE_NAME}.zip`);
    setNotice(null);
    setPercent(0);
    setStage("preparing");
    setBusy(`${book.id}-zip`);
    void (async () => {
      let targetKind = "unknown";
      const record = (stage: string, category: string, detail: { status?: number; asset?: string } = {}) => {
        console.warn("[memory-book-offline-export]", { stage, category, ...detail, target: targetKind });
        void reportIssue({ data: { bookId: book.id, stage, category, ...detail, target: targetKind } }).catch(() => {});
      };
      try {
        const target = await targetPromise;
        targetKind = target.kind === "download" ? `download:${target.reason}` : target.kind;
        if (target.kind === "cancelled") {
          record("choosing_file", "cancelled");
          setNotice(t("mbd_download_cancelled"));
          return;
        }
        setStage("preparing");
        let res;
        try {
          res = await buildPlan({ data: { bookId: book.id } });
        } catch {
          record("preparing", "plan_failed");
          setNotice(t("mbd_download_failed"));
          return;
        }
        if (!res.ok) {
          record("preparing", res.error, { asset: res.asset });
          setNotice(t(res.error === "missing_asset" ? "mbd_download_missing" : "mbd_download_failed"));
          return;
        }
        const { saveOfflineBookPackage } = await import("@/lib/memory-book/offline-zip");
        await saveOfflineBookPackage(res.plan, target, ({ stage, done: ready, total }) => {
          setStage(stage);
          setPercent(total > 0 ? Math.min(99, Math.round((ready / total) * 100)) : 0);
        });
        setNotice(t(target.kind === "file" ? "mbd_download_done" : "mbd_download_started"));
      } catch (error) {
        const { OfflineExportError } = await import("@/lib/memory-book/offline-zip");
        if (error instanceof OfflineExportError) {
          record(error.stage, error.category, error.detail);
          setNotice(
            t(
              error.category === "missing_asset"
                ? "mbd_download_missing"
                : error.category === "save_failed"
                  ? "mbd_download_save_failed"
                  : error.category === "asset_network" || error.category === "asset_http"
                    ? "mbd_download_network"
                    : "mbd_download_failed",
            ),
          );
        } else {
          record("unknown", "unexpected");
          setNotice(t("mbd_download_failed"));
        }
      } finally {
        setBusy(null);
        setPercent(0);
      }
    })();
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["my-memory-books"],
    queryFn: () => fetchBooks({ data: undefined }),
  });

  const books: MemoryBookProject[] = (data?.books ?? []).filter((book) => memoryBookCollection(book) === collection);

  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleDateString(lang) : "—";
  };

  const { data: offerData } = useQuery({
    queryKey: ["memory-book-storage-offers"],
    queryFn: () => readOffers(),
  });
  const offers = offerData?.offers ?? [];
  const afterPurchase = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["my-memory-books"] }),
      queryClient.invalidateQueries({ queryKey: ["memory-book-storage-offers"] }),
      refresh(),
    ]);

  return (
    <>
      <DashboardPageHeader titleKey={collection === "working" ? "mbd_in_progress" : collection === "completed" ? "mbd_finished" : "mbd_storage"} subtitleKey={collection === "storage" ? "mbd_storage_sub" : "mbd_sub"} />
      <MemoryBookDashboardNavigation />

      <div className="mb-6">
        <Button asChild>
          <Link to="/memory-book-packages">
            <Plus className="mr-2 h-4 w-4" />
            {t("mbd_create_another")}
          </Link>
        </Button>
      </div>

      {notice && <p className="mb-4 text-sm text-muted-foreground">{notice}</p>}

      {data?.storageEvidenceUnavailable && <p role="status" className="mb-4 text-sm text-muted-foreground">{t("mbd_evidence_unavailable")}</p>}
      {isError ? (
        <div role="alert" className="space-y-3">
          <p className="text-sm text-destructive">{t("mbd_load_failed")}</p>
          <Button variant="outline" onClick={() => void refetch()}>{t("mbd_retry")}</Button>
        </div>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">{t("mb_admin_loading")}</p>
      ) : books.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t(`mbd_empty_${collection}`)}</p>
      ) : (
        <ul className="grid min-w-0 gap-4 lg:grid-cols-2">
          {books.map((book) => {
            const left = daysLeft(book.expiresAt);
            const done = book.status === "completed";
            const storageUntil = collection === "storage" ? book.purchasedStorageExpiresAt : book.retentionExpiresAt;
            const keptLeft = storageUntil ? daysLeft(storageUntil) : 0;
            return (
              <li
                key={book.id}
                data-book-id={book.id}
                className="min-w-0 rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <MemoryBookDashboardCover bookId={book.id} />
                  <div className="min-w-0">
                    <p className="font-display text-base font-semibold">
                      {fill(t("mbp_book_summary"), {
                        l: book.leaves,
                        p: book.internalPages,
                        v: book.videoCapacity,
                      })}
                    </p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-primary">
                      {collection === "storage" ? t("mbd_status_stored") : done ? t("mbd_status_completed") : t("mbd_status_unfinished")}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("mbd_started")}: {formatDate(book.createdAt)}
                    </p>
                    {done ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          {t("mbd_completed_on")}: {formatDate(book.completedAt ?? "")}
                        </p>
                        {storageUntil && (
                          <p className="text-sm text-muted-foreground">
                            {t("mbx_stored_until")}: {formatDate(storageUntil)}
                            {" · "}
                            {keptLeft > 0 ? fill(t("mbx_days_left"), { n: keptLeft }) : t("mbx_keep_expired")}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">
                          {t("mbx_finish_until")}: {formatDate(book.expiresAt)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {left > 0 ? fill(t("mbd_remaining"), { n: left }) : t("mbd_expired")}
                        </p>
                      </>
                    )}
                    <p className="mt-1 text-sm text-muted-foreground">
                      {fill(t("mbd_spent"), { n: book.creditsSpent })}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {done ? (
                    <>
                      <Button asChild size="sm" variant="outline" className="min-h-11">
                        <Link to="/memory-book-preview" search={{ book: book.id }}>
                          {t("mbd_open_book")}
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        className="h-auto min-h-11 whitespace-normal"
                        disabled={busy !== null}
                        onClick={() => runDownload(book)}
                      >
                        {busy === `${book.id}-zip`
                          ? fill(t(`mbd_download_stage_${stage}`), { n: percent })
                          : t("mbd_download")}
                      </Button>
                      <Button size="sm" variant="outline" className="min-h-11" onClick={() => setSharing(book.id)}>
                        {t("mbs_share")}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button asChild size="sm" className="min-h-11">
                        <Link to="/memory-book-create" search={{ book: book.id }}>
                          {t("mbd_continue")}
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
                <StorageExtensionPanel book={book} offers={offers} onPurchased={afterPurchase} completedActionLabelKey={collection === "storage" ? "mbd_extend" : "mbd_save_long_term"} />
              </li>
            );
          })}
        </ul>
      )}
      {sharing && (
        <MemoryBookShareDialog
          bookId={sharing}
          open={sharing !== null}
          onOpenChange={(open) => !open && setSharing(null)}
        />
      )}
    </>
  );
}


function MemoryBookDashboardCover({ bookId }: { bookId: string }) {
  const loadDesigns = useServerFn(loadMemoryBookDesigns);
  const { data } = useQuery({ queryKey: ["memory-book-dashboard-cover", bookId], queryFn: () => loadDesigns({ data: { bookId } }), staleTime: 30 * 60 * 1000 });
  const [failed, setFailed] = useState(false);
  const state = data?.state;
  const cover = state?.cover.variants.find((v) => v.id === state.cover.selectedId)?.url;
  return (
    <div className="flex aspect-[3/4] w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted sm:w-20">
      {cover && !failed ? <img src={cover} alt="" className="h-full w-full object-contain" onError={() => setFailed(true)} /> : <BookOpen className="h-6 w-6 text-primary" aria-hidden />}
    </div>
  );
}
