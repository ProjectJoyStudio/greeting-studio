import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import {
  createMemoryBookShare,
  disableMemoryBookShare,
  listMemoryBookShares,
  type MemoryBookShareLink,
} from "@/lib/memory-book/share.functions";

export function shareUrl(token: string) {
  return `${window.location.origin}/memory-book/share/${token}`;
}

/** Owner-only management of the public links of one finished book. */
export function MemoryBookShareDialog({
  bookId,
  open,
  onOpenChange,
}: {
  bookId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, lang } = useI18n();
  const list = useServerFn(listMemoryBookShares);
  const create = useServerFn(createMemoryBookShare);
  const disable = useServerFn(disableMemoryBookShare);
  const [links, setLinks] = useState<MemoryBookShareLink[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const res = await list({ data: { bookId } });
    if (res.ok) setLinks(res.links);
  }, [bookId, list]);

  useEffect(() => {
    if (open) {
      setNotice(null);
      void reload().catch(() => setNotice(t("mbs_failed")));
    }
  }, [open, reload, t]);

  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(shareUrl(token));
      setNotice(t("mbs_copied"));
    } catch {
      setNotice(shareUrl(token));
    }
  }

  async function onCreate() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await create({ data: { bookId } });
      if (!res.ok) setNotice(t("mbs_failed"));
      else {
        await reload();
        await copy(res.link.token);
      }
    } catch {
      setNotice(t("mbs_failed"));
    } finally {
      setBusy(false);
    }
  }

  async function onDisable(id: string) {
    if (!window.confirm(t("mbs_disable_confirm"))) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await disable({ data: { shareId: id } });
      if (!res.ok) setNotice(t("mbs_failed"));
      await reload();
    } catch {
      setNotice(t("mbs_failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("mbs_title")}</DialogTitle>
          <DialogDescription>{t("mbs_hint")}</DialogDescription>
        </DialogHeader>
        <Button disabled={busy} onClick={() => void onCreate()}>
          {t("mbs_create")}
        </Button>
        {notice && <p className="break-all text-sm text-muted-foreground">{notice}</p>}
        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("mbs_none")}</p>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {links.map((link) => (
              <li
                key={link.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2"
              >
                <span className="text-sm">
                  {t("mbs_created")}: {new Date(link.createdAt).toLocaleString(lang)} ·{" "}
                  <span className={link.active ? "font-medium text-primary" : "text-muted-foreground"}>
                    {link.active ? t("mbs_active") : t("mbs_disabled")}
                  </span>
                </span>
                {link.active && (
                  <span className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => void copy(link.token)}>
                      {t("mbs_copy")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void onDisable(link.id)}
                    >
                      {t("mbs_disable")}
                    </Button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
