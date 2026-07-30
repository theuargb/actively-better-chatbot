"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Clock,
  MessageSquarePlus,
  SquarePen,
  TriangleAlert,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "ui/alert";
import { Button } from "ui/button";
import { Separator } from "ui/separator";
import type { RateLimitMessagePayload } from "lib/ai/rate-limit-message";

/**
 * Shared shell so the rate-limit and thread-limit notices read as one family:
 * an outlined card, a tinted icon chip, and a muted meta row beneath.
 */
function LimitNotice({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="w-full mx-auto max-w-3xl px-6 mt-4 animate-in fade-in slide-in-from-bottom-1 duration-300">
      <Alert className="p-0 overflow-hidden bg-card/60 backdrop-blur-sm">
        <div className="flex items-start gap-3.5 p-4">
          <div className="shrink-0 grid place-items-center size-9 rounded-lg border bg-muted/50 text-muted-foreground">
            {icon}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <AlertTitle className="col-start-1 text-sm font-medium tracking-tight">
              {title}
            </AlertTitle>
            <AlertDescription className="col-start-1 text-sm leading-relaxed">
              {description}
            </AlertDescription>
          </div>
        </div>
        {children ? (
          <>
            <Separator />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 bg-muted/30">
              {children}
            </div>
          </>
        ) : null}
      </Alert>
    </div>
  );
}

export function RateLimitNotice({
  payload,
}: {
  payload: RateLimitMessagePayload;
}) {
  const t = useTranslations("Chat");
  const retryMinutes = Math.max(1, Math.ceil(payload.retryAfterSeconds / 60));

  return (
    <LimitNotice
      icon={<TriangleAlert className="size-4" />}
      title={t("rateLimitedTitle")}
      description={
        payload.window === "hour"
          ? t("rateLimitedHourly", { limit: payload.limit })
          : t("rateLimitedDaily", { limit: payload.limit })
      }
    >
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="size-3.5" />
        {t("rateLimitedRetryAfter", { minutes: retryMinutes })}
      </span>
      <span className="text-xs text-muted-foreground">
        {t("rateLimitedSupport")}
      </span>
    </LimitNotice>
  );
}

export function ThreadLimitNotice({ limit }: { limit: number }) {
  const t = useTranslations("Chat");
  const router = useRouter();

  return (
    <LimitNotice
      icon={<MessageSquarePlus className="size-4" />}
      title={t("threadLimitReachedTitle", { limit })}
      description={t("threadLimitReachedDescription")}
    >
      <Button size="sm" className="h-8" onClick={() => router.push("/")}>
        <SquarePen className="size-3.5" />
        {t("threadLimitNewChat")}
      </Button>
      <span className="text-xs text-muted-foreground">
        {t("threadLimitKeepsContextSharp")}
      </span>
    </LimitNotice>
  );
}
