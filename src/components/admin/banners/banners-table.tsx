"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ImageIcon, Loader, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "ui/table";
import { Badge } from "ui/badge";
import { Button, buttonVariants } from "ui/button";
import { TablePagination } from "ui/table-pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "ui/alert-dialog";
import { cn } from "lib/utils";
import {
  isBannerActive,
  isBannerScheduled,
  resolveBannerVariant,
  type BannerListItem,
} from "app-types/banner";
import { deleteBannerAction } from "@/app/api/admin/banners/actions";

const BASE_URL = "/admin/banners";

interface BannersTableProps {
  items: BannerListItem[];
  total: number;
  page: number;
  limit: number;
}

export function BannersTable({ items, total, page, limit }: BannersTableProps) {
  const t = useTranslations("Admin.Banners");
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<BannerListItem | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const buildUrl = useCallback(({ page: nextPage }: { page: number }) => {
    return nextPage > 1 ? `${BASE_URL}?page=${nextPage}` : BASE_URL;
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    startDelete(async () => {
      const result = await deleteBannerAction(deleteTarget.id);
      if (result.success) {
        toast.success(t("bannerDeleted"));
        setDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }, [deleteTarget, router, t]);

  const deleteTargetCaption =
    (deleteTarget && resolveBannerVariant(deleteTarget)?.caption) ?? "";

  const formatSchedule = (item: BannerListItem) => {
    if (!item.startAt && !item.endAt) return t("scheduleAlways");
    const start = item.startAt ? format(item.startAt, "MMM d, yyyy") : "…";
    const end = item.endAt ? format(item.endAt, "MMM d, yyyy") : "…";
    return `${start} – ${end}`;
  };

  const statusLabel = (item: BannerListItem) => {
    if (!item.enabled) return t("statusDisabled");
    if (isBannerScheduled(item)) return t("statusScheduled");
    if (isBannerActive(item)) return t("statusActive");
    return t("statusEnded");
  };

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center gap-4">
        <div className="text-sm text-muted-foreground">
          {t("totalCount", { count: total })}
        </div>
        <div className="flex-1" />
        <Link
          href={`${BASE_URL}/new`}
          className={cn("shrink-0", buttonVariants())}
          data-testid="banner-new-button"
        >
          <Plus className="h-4 w-4 mr-1" />
          {t("newBanner")}
        </Link>
      </div>

      <div className="rounded-lg border bg-card w-full overflow-x-auto">
        <Table data-testid="banners-table" className="w-full">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10" />
              <TableHead>{t("columnCaption")}</TableHead>
              <TableHead>{t("columnLocales")}</TableHead>
              <TableHead>{t("columnSchedule")}</TableHead>
              <TableHead>{t("columnStatus")}</TableHead>
              <TableHead>{t("columnSeen")}</TableHead>
              <TableHead>{t("columnCreated")}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <p className="font-medium">{t("noBannersFound")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("noBannersFoundDescription")}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const variant = resolveBannerVariant(item);
                const active = isBannerActive(item);
                return (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`${BASE_URL}/${item.id}`)}
                    data-testid={`banner-row-${item.id}`}
                  >
                    <TableCell>
                      <div className="flex size-8 items-center justify-center overflow-hidden rounded-md border bg-muted/40">
                        {item.imageUrl ? (
                          // Admin-uploaded, so the host is not known to next/image.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="size-3.5 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{variant?.caption}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-xs">
                        {variant?.subtitle || variant?.body}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.variants.map((v) => (
                          <Badge
                            key={v.locale}
                            variant="secondary"
                            className="font-normal uppercase"
                          >
                            {v.locale}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {formatSchedule(item)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge variant={active ? "secondary" : "outline"}>
                          {statusLabel(item)}
                        </Badge>
                        {item.resetState && (
                          <Badge
                            variant="outline"
                            className="font-normal text-destructive"
                          >
                            {t("resetsState")}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {item.dismissalCount}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(item.createdAt, "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        aria-label={t("deleteBanner")}
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeleteTarget(item);
                        }}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        currentPage={page}
        totalPages={Math.ceil(total / limit)}
        buildUrl={buildUrl}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteBanner")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteBannerConfirm", { caption: deleteTargetCaption })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmDelete();
              }}
              className={buttonVariants({ variant: "destructive" })}
            >
              {isDeleting && <Loader className="size-3.5 mr-1 animate-spin" />}
              {t("deleteBanner")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
