"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/lib/use-api";
import type { HerbBreakdownItem, StatsData } from "@/lib/types";

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

  if (error) {
    return (
      <div className="space-y-3">
        <h1 className="text-[18px] font-[590]">利润统计</h1>
        <p className="text-[13px] text-(--danger)">加载失败：{error}</p>
      </div>
    );
  }

  const formatCNY = (val: number) => `¥${val.toFixed(2)}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-[590] tracking-[-0.01em]">利润统计</h1>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="panel p-4">
          <p className="text-[11px] font-[510] uppercase tracking-[0.08em] text-(--muted)">
            总营收
          </p>
          <p className="mt-1 text-[18px] font-[590] tabular-nums">
            {formatCNY(stats?.totalRevenue ?? 0)}
          </p>
        </div>
        <div className="panel p-4">
          <p className="text-[11px] font-[510] uppercase tracking-[0.08em] text-(--muted)">
            总成本
          </p>
          <p className="mt-1 text-[18px] font-[590] tabular-nums">
            {formatCNY(stats?.totalCost ?? 0)}
          </p>
        </div>
        <div className="panel p-4">
          <p className="text-[11px] font-[510] uppercase tracking-[0.08em] text-(--muted)">
            总利润
          </p>
          <p className="mt-1 text-[18px] font-[590] tabular-nums text-(--success)">
            {formatCNY(stats?.totalProfit ?? 0)}
          </p>
        </div>
        <div className="panel p-4">
          <p className="text-[11px] font-[510] uppercase tracking-[0.08em] text-(--muted)">
            药方数
          </p>
          <p className="mt-1 text-[18px] font-[590] tabular-nums">
            {stats?.prescriptionCount ?? 0}
          </p>
        </div>
      </div>

      {/* Per-herb breakdown */}
      {stats?.herbBreakdown && stats.herbBreakdown.length > 0 && (
        <div className="panel overflow-hidden">
          <div className="border-b border-(--border) px-4 py-3 text-[13px] font-[510]">
            按药材维度
          </div>
          {stats.herbBreakdown.map((h, i) => (
            <div
              key={h.name}
              className="flex items-center justify-between border-b border-(--border) px-4 py-3 last:border-b-0"
            >
              <span className="text-[13px] font-medium">{h.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-[12px] tabular-nums text-(--muted)">
                  {h.prescriptionCount}次
                </span>
                <span className="text-[13px] tabular-nums">
                  {formatCNY(h.revenue)}
                </span>
                <span className="text-[13px] font-medium tabular-nums text-(--success)">
                  {formatCNY(h.profit)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
