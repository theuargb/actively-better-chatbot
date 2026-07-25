"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ui/select";
import { Tabs, TabsList, TabsTrigger } from "ui/tabs";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "ui/chart";
import { useTranslations } from "next-intl";
import { AdminUsageOverview, AdminUsagePeriod } from "app-types/admin";
import { cn } from "lib/utils";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const PERIODS: AdminUsagePeriod[] = ["all", "90", "30", "7"];

type TimelineMetric = "messages" | "tokens";

interface UsageChartsProps {
  period: AdminUsagePeriod;
  onPeriodChange: (value: string) => void;
  timeline: AdminUsageOverview["timeline"];
  models: AdminUsageOverview["models"];
  isPending: boolean;
}

export function UsageCharts({
  period,
  onPeriodChange,
  timeline,
  models,
  isPending,
}: UsageChartsProps) {
  const t = useTranslations("Admin.Usage");
  const [metric, setMetric] = useState<TimelineMetric>("messages");

  const periodLabels: Record<AdminUsagePeriod, string> = {
    all: t("allTime"),
    "90": t("last90Days"),
    "30": t("last30Days"),
    "7": t("last7Days"),
  };

  const timelineConfig: ChartConfig = useMemo(
    () => ({
      messages: { label: t("messages"), color: "var(--chart-1)" },
      tokens: { label: t("tokens"), color: "var(--chart-2)" },
    }),
    [t],
  );

  const timelineData = useMemo(
    () =>
      timeline.map((point) => ({
        date: point.date,
        label: format(parseISO(point.date), "MMM d"),
        messages: point.messages,
        tokens: point.tokens,
      })),
    [timeline],
  );

  const topModels = useMemo(
    () =>
      models
        .filter((m) => m.messageCount > 0)
        .slice(0, 8)
        .map((m) => ({
          model: m.model,
          tokens: m.totalTokens,
        })),
    [models],
  );

  const modelsConfig: ChartConfig = useMemo(
    () => ({
      tokens: { label: t("tokens"), color: "var(--chart-1)" },
    }),
    [t],
  );

  return (
    <div className="space-y-3" data-testid="usage-charts">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {t("analytics")}
        </h3>
        <Select value={period} onValueChange={onPeriodChange}>
          <SelectTrigger
            size="sm"
            className="w-[160px]"
            data-testid="usage-period-select"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => (
              <SelectItem key={p} value={p}>
                {periodLabels[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        className={cn(
          "grid gap-4 lg:grid-cols-2 transition-opacity",
          isPending && "opacity-50 pointer-events-none",
        )}
      >
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{t("activityOverTime")}</CardTitle>
            <Tabs
              value={metric}
              onValueChange={(v) => setMetric(v as TimelineMetric)}
            >
              <TabsList>
                <TabsTrigger value="messages">{t("messages")}</TabsTrigger>
                <TabsTrigger value="tokens">{t("tokens")}</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={timelineConfig}
              className="h-[260px] w-full"
            >
              <AreaChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={24}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={40}
                  allowDecimals={false}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
                />
                <Area
                  type="monotone"
                  dataKey={metric}
                  stroke={`var(--color-${metric})`}
                  fill={`var(--color-${metric})`}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-base">
              {t("topModelsByTokens")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topModels.length > 0 ? (
              <ChartContainer
                config={modelsConfig}
                className="h-[260px] w-full"
              >
                <BarChart data={topModels} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="model"
                    width={110}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent />}
                  />
                  <Bar dataKey="tokens" radius={4}>
                    {topModels.map((entry, index) => (
                      <Cell
                        key={entry.model}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
                {t("noUsageYet")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
