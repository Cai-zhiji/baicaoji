"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Loader2, TrendingUp, ArrowUpRight, ArrowDownRight, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/lib/use-api";
import type { StatsData } from "@/lib/types";

export default function StatsPage() {
  const [period, setPeriod] = useState("all");
  const params = period !== "all" ? `?period=${period}` : "";
  const { data: stats, loading, error } = useApi<StatsData>(`/api/stats${params}`);
  const [exporting, setExporting] = useState(false);

  async function exportData() {
    setExporting(true);
    try {
      const res = await fetch("/api/export");
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "导出失败" }));
        toast.error(err.error || "导出失败");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `百草计_数据导出_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("数据已导出");
    } catch {
      toast.error("导出失败");
    } finally {
      setExporting(false);
    }
  }

  const formatCNY = (val: number) => `¥${val.toFixed(2)}`;
  const formatCompact = (val: number) => {
    if (val >= 10000) return `¥${(val / 10000).toFixed(1)}万`;
    if (val >= 1000) return `¥${(val / 1000).toFixed(1)}k`;
    return `¥${val.toFixed(2)}`;
  };

  const profitMargin = stats && stats.totalRevenue > 0
    ? (stats.totalProfit / stats.totalRevenue) * 100
    : 0;

  const maxProfit = stats?.herbBreakdown?.reduce((m, h) => Math.max(m, h.profit), 0) ?? 0;

  if (error) {
    return (
      <div className="flex flex-col gap-3 pb-6">
        <h1 className="text-[17px] font-[590]">利润统计</h1>
        <p className="text-[13px] text-(--danger)">加载失败：{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-6">
      {/* Sticky header */}
      <div
        className="sticky top-0 z-10 -mx-4 flex flex-col gap-2 border-b border-(--border) px-4 py-2"
        style={{ background: "var(--bg)" }}
      >
        <div className="flex items-center justify-between">
          <h1 className="text-[17px] font-[590] tracking-[-0.01em]">利润统计</h1>
          <Button size="sm" variant="outline" onClick={exportData} disabled={exporting}>
            {exporting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
            {exporting ? "导出中…" : "导出"}
          </Button>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v ?? "all")}>
          <TabsList>
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="monthly">本月</TabsTrigger>
            <TabsTrigger value="quarterly">本季度</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading && !stats ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-(--muted)" />
        </div>
      ) : (
        <>
          {/* Hero — 利润大卡 */}
          <div
            className="panel relative overflow-hidden p-5"
            style={{
              background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)",
              color: "var(--on-accent)",
              borderColor: "transparent",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-[510] uppercase tracking-[0.1em] opacity-80">
                总利润
              </span>
              <TrendingUp className="h-4 w-4 opacity-70" />
            </div>
            <p className="mt-2 text-[34px] font-[620] tabular-nums leading-none tracking-[-0.02em]">
              {formatCNY(stats?.totalProfit ?? 0)}
            </p>
            <div className="mt-3 flex items-center gap-4 text-[12px] opacity-90">
              <span className="tabular-nums">
                利润率 {profitMargin.toFixed(1)}%
              </span>
              <span className="tabular-nums">
                {stats?.prescriptionCount ?? 0} 张药方
              </span>
            </div>
          </div>

          {/* 营收 / 成本 二联 */}
          <div className="grid grid-cols-2 gap-2">
            <div className="panel p-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-[510] uppercase tracking-[0.08em] text-(--muted)">
                  总营收
                </p>
                <ArrowUpRight className="h-3.5 w-3.5 text-(--muted)" />
              </div>
              <p className="mt-1 text-[18px] font-[590] tabular-nums text-(--fg)">
                {formatCompact(stats?.totalRevenue ?? 0)}
              </p>
            </div>
            <div className="panel p-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-[510] uppercase tracking-[0.08em] text-(--muted)">
                  总成本
                </p>
                <ArrowDownRight className="h-3.5 w-3.5 text-(--muted)" />
              </div>
              <p className="mt-1 text-[18px] font-[590] tabular-nums text-(--fg)">
                {formatCompact(stats?.totalCost ?? 0)}
              </p>
            </div>
          </div>

          {/* Per-herb breakdown */}
          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-(--border) px-3 py-2.5">
              <span className="text-[13px] font-[510]">按药材维度</span>
              {stats?.herbBreakdown && stats.herbBreakdown.length > 0 && (
                <span className="text-[11px] text-(--muted) tabular-nums">
                  {stats.herbBreakdown.length} 种
                </span>
              )}
            </div>
            {!stats?.herbBreakdown || stats.herbBreakdown.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <BarChart3
                  className="mb-2 h-8 w-8"
                  style={{ color: "var(--muted)", opacity: 0.5 }}
                  strokeWidth={1.5}
                />
                <p className="text-[13px] text-(--muted)">暂无数据</p>
              </div>
            ) : (
              <div className="divide-y divide-(--border)/60">
                {stats.herbBreakdown.map((h) => {
                  const ratio = maxProfit > 0 ? h.profit / maxProfit : 0;
                  return (
                    <div key={h.name} className="px-3 py-2.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="flex min-w-0 items-baseline gap-2">
                          <span className="truncate text-[13px] font-[510] text-(--fg)">
                            {h.name}
                          </span>
                          <span className="shrink-0 text-[11px] text-(--muted) tabular-nums">
                            {h.prescriptionCount}次
                          </span>
                        </div>
                        <span className="shrink-0 text-[13px] font-[590] tabular-nums text-(--success)">
                          {formatCompact(h.profit)}
                        </span>
                      </div>
                      {/* Profit bar */}
                      <div
                        className="mt-1.5 h-1 overflow-hidden rounded-full"
                        style={{ background: "var(--muted-bg)" }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.max(ratio * 100, 2)}%`,
                            background: "var(--success)",
                          }}
                        />
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-(--muted) tabular-nums">
                        <span>营收 {formatCompact(h.revenue)}</span>
                        <span>成本 {formatCompact(h.cost)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
