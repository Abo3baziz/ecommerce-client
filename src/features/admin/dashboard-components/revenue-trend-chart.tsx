"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { AdminStats } from "@/types";

const chartConfig = {
  gross: { label: "Gross", color: "var(--chart-2)" },
  net: { label: "Net", color: "var(--chart-1)" },
} satisfies ChartConfig;

function formatBucketLabel(
  iso: string,
  bucket: AdminStats["period"]["bucket"],
): string {
  const date = new Date(iso);
  return bucket === "hour"
    ? date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: false,
        timeZone: "UTC",
      })
    : date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
}

function formatAxisMoney(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  }
  return value.toFixed(0);
}

export function RevenueTrendChart({ stats }: { stats: AdminStats }) {
  const data = stats.series.map((point) => ({
    ...point,
    gross: Number(point.gross),
    net: Number(point.net),
    label: formatBucketLabel(point.bucket_start, stats.period.bucket),
  }));

  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <AreaChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
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
          width={48}
          tickFormatter={formatAxisMoney}
          allowDecimals={false}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          dataKey="gross"
          type="monotone"
          stroke="var(--color-gross)"
          fill="var(--color-gross)"
          fillOpacity={0.12}
          strokeWidth={2}
        />
        <Area
          dataKey="net"
          type="monotone"
          stroke="var(--color-net)"
          fill="var(--color-net)"
          fillOpacity={0.2}
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
