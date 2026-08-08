"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Loader, Plus, Trash2 } from "lucide-react";
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
import { PromptAdIcon } from "ui/prompt-ad-icon";
import { cn } from "lib/utils";
import {
  isPromptAdActive,
  resolvePromptAdVariant,
  type PromptAdListItem,
} from "app-types/prompt-ad";
import { deletePromptAdAction } from "@/app/api/admin/prompt-ads/actions";

const BASE_URL = "/admin/prompt-ads";

interface PromptAdsTableProps {
  items: PromptAdListItem[];
  total: number;
  page: number;
  limit: number;
}

export function PromptAdsTable({
  items,
  total,
  page,
  limit,
}: PromptAdsTableProps) {
  const t = useTranslations("Admin.PromptAds");
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<PromptAdListItem | null>(
    null,
  );
  const [isDeleting, startDelete] = useTransition();

  const buildUrl = useCallback(({ page: nextPage }: { page: number }) => {
    return nextPage > 1 ? `${BASE_URL}?page=${nextPage}` : BASE_URL;
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    startDelete(async () => {
      const result = await deletePromptAdAction(deleteTarget.id);
      if (result.success) {
        toast.success(t("adDeleted"));
        setDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }, [deleteTarget, router, t]);

  const deleteTargetCaption =
    (deleteTarget && resolvePromptAdVariant(deleteTarget)?.caption) ?? "";

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
          data-testid="prompt-ad-new-button"
        >
          <Plus className="h-4 w-4 mr-1" />
          {t("newAd")}
        </Link>
      </div>

      <div className="rounded-lg border bg-card w-full overflow-x-auto">
        <Table data-testid="prompt-ads-table" className="w-full">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10" />
              <TableHead>{t("columnCaption")}</TableHead>
              <TableHead>{t("columnLocales")}</TableHead>
              <TableHead>{t("columnModels")}</TableHead>
              <TableHead>{t("columnMode")}</TableHead>
              <TableHead>{t("columnStatus")}</TableHead>
              <TableHead>{t("columnCreated")}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <p className="font-medium">{t("noAdsFound")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("noAdsFoundDescription")}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const variant = resolvePromptAdVariant(item);
                const active = isPromptAdActive(item);
                const expired =
                  item.enabled &&
                  !!item.expiresAt &&
                  item.expiresAt.getTime() <= Date.now();
                return (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`${BASE_URL}/${item.id}`)}
                    data-testid={`prompt-ad-row-${item.id}`}
                  >
                    <TableCell>
                      <PromptAdIcon icon={item.icon} />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{variant?.caption}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-xs">
                        {variant?.prompt}
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
                    <TableCell>
                      {item.models?.length ? (
                        <div className="flex flex-wrap gap-1 max-w-[16rem]">
                          {item.models.map((model) => (
                            <Badge
                              key={`${model.provider}:${model.model}`}
                              variant="secondary"
                              className="font-normal"
                            >
                              {model.model}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {t("allModels")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {item.mode === "send"
                          ? t("modeSend")
                          : t("modePrefill")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={active ? "secondary" : "outline"}>
                        {expired
                          ? t("expired")
                          : item.enabled
                            ? t("enabled")
                            : t("disabled")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(item.createdAt, "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        aria-label={t("deleteAd")}
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
            <AlertDialogTitle>{t("deleteAd")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteAdConfirm", { caption: deleteTargetCaption })}
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
              {t("deleteAd")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
