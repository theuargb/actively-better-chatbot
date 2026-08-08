"use client";

import { useCallback, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader, Sparkles } from "lucide-react";

import { Button } from "ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "ui/dialog";
import { Markdown } from "@/components/markdown";
import { dismissBannerAction } from "@/app/api/banner/actions";
import { resetClientState } from "lib/browser-state-reset";
import type { BannerAnnouncement } from "app-types/banner";

/**
 * The "what's new" modal. Shown once per user - closing it any way (button,
 * overlay, Esc) records the dismissal, because a banner that reappears after
 * Esc is worse than one that is missed.
 */
export function BannerAnnouncement({ banner }: { banner: BannerAnnouncement }) {
  const t = useTranslations("Chat.Banner");
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const [isDismissing, startDismissing] = useTransition();

  const dismiss = useCallback(() => {
    if (isDismissing) return;
    setOpen(false);
    startDismissing(async () => {
      await dismissBannerAction(banner.id);
      if (banner.resetState) {
        resetClientState();
        window.location.reload();
        return;
      }
      // Surfaces the next queued banner without a manual refresh.
      router.refresh();
    });
  }, [banner, isDismissing, router]);

  // The admin console is a workspace, not a place to be interrupted - an admin
  // authoring a banner should not have it thrown over the form they just saved.
  // It stays queued and opens as soon as they navigate back into the app.
  if (pathname.startsWith("/admin")) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && dismiss()}>
      <DialogContent
        className="sm:max-w-lg p-0 gap-0 overflow-hidden"
        data-testid="banner-announcement"
      >
        <div className="flex flex-col items-center gap-3 border-b bg-muted/40 px-6 py-8 text-center">
          {banner.imageUrl ? (
            // Admin-uploaded, so the host is not known to next/image.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={banner.imageUrl}
              alt=""
              className="size-14 rounded-xl object-cover"
            />
          ) : (
            <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="size-6 text-primary" />
            </div>
          )}
          <DialogTitle className="text-xl font-semibold">
            {banner.caption}
          </DialogTitle>
          {banner.subtitle ? (
            <DialogDescription>{banner.subtitle}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">
              {banner.caption}
            </DialogDescription>
          )}
        </div>

        {/* Markdown blocks carry their own outer margins, which protrude past
            the scroll container and trip a scrollbar on bodies that plainly
            fit. The padding here supplies the spacing instead. */}
        <div className="max-h-[50vh] overflow-y-auto px-6 py-5 text-sm [&_article>*:first-child]:mt-0 [&_article>*:last-child]:mb-0">
          <Markdown>{banner.body}</Markdown>
        </div>

        <div className="px-6 pb-6">
          <Button
            className="w-full"
            onClick={dismiss}
            disabled={isDismissing}
            data-testid="banner-dismiss"
          >
            {isDismissing && <Loader className="size-3.5 mr-1 animate-spin" />}
            {t("gotIt")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
