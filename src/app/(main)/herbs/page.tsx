"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { toPinyin, toPinyinInitials } from "@/lib/pinyin";
import { AzIndex, groupByFirstLetter } from "@/components/ui/az-index";
import { Plus, Pencil, Trash2, Upload, Search, Loader2 } from "lucide-react";
import { useMutation } from "@/lib/use-mutation";
import type { Herb } from "@/lib/types";

export default function HerbsPage() {
  const [herbs, setHerbs] = useState<Herb[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Herb | null>(null);
  const [name, setName] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [stock, setStock] = useState("");
  const [unit, setUnit] = useState("");
  const [unitGrams, setUnitGrams] = useState("");
  const [importing, setImporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Herb | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const { execute: clearAllHerbs, loading: clearing } = useMutation<{ message?: string }>({
    url: "/api/herbs",
    method: "DELETE",
    onSuccess: (result) => {
      toast.success(result?.message || "已清空");
      setHerbs([]);
    },
    errorMessage: "清空失败",
  });

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/herbs/import", { method: "POST", body: formData });
      const result = await res.json();
      if (res.ok) {
        toast.success(result.message || "导入成功");
        const data = await fetch("/api/herbs").then((r) => r.json());
        setHerbs(data);
      } else {
        toast.error(result.error || "导入失败");
      }
    } catch {
      toast.error("导入失败");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    fetch("/api/herbs")
      .then((r) => r.json())
      .then((data) => { setHerbs(data); setInitialLoading(false); })
      .catch(() => { toast.error("加载药材失败"); setInitialLoading(false); });
  }, []);

  // 按最近使用排序（updatedAt 在开方扣库存时会自动更新）
  const herbsSorted = [...herbs].sort(
    (a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime()
  );

  const filtered = herbsSorted.filter((h) => {
    if (!search) return true;
    const q = search.toLowerCase();
    try {
      return (
        h.name.includes(q) ||
        h.pinyin.includes(q) ||
        toPinyinInitials(h.name).includes(q)
      );
    } catch {
      return h.name.includes(q);
    }
  });

  // 无搜索时只展示最近使用的 5 个
  const displayed = search ? filtered : filtered.slice(0, 20);

  function reset() {
    setName("");
    setSellPrice("");
    setCostPrice("");
    setStock("");
    setUnit("");
    setUnitGrams("");
    setEditing(null);
  }

  async function save() {
    if (!name.trim()) {
      toast.error("请输入药材名称");
      return;
    }
    const url = editing ? `/api/herbs/${editing.id}` : "/api/herbs";
    const method = editing ? "PUT" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          sellPrice: parseFloat(sellPrice) || 0,
          costPrice: parseFloat(costPrice) || 0,
          stock: stock ? parseFloat(stock) : undefined,
          unit: unit || null,
          unitGrams: unitGrams ? parseFloat(unitGrams) : null,
        }),
      });
      if (res.ok) {
        toast.success(editing ? "药材已更新" : "药材已添加");
        setOpen(false);
        reset();
        const data = await fetch("/api/herbs").then((r) => r.json());
        setHerbs(data);
      } else {
        const err = await res.json();
        toast.error(err.error || "保存失败");
      }
    } catch {
      toast.error("保存失败");
    }
  }

  async function remove(id: number) {
    try {
      const res = await fetch(`/api/herbs/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("药材已删除");
        setHerbs((prev) => prev.filter((h) => h.id !== id));
      } else {
        toast.error("删除失败");
      }
    } catch {
      toast.error("删除失败");
    } finally {
      setDeleteTarget(null);
    }
  }

  async function clearAll() {
    await clearAllHerbs();
    setShowClearConfirm(false);
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-(--muted)" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 space-y-3 pb-3">
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-[590] tracking-[-0.01em]">药材管理</h1>
        <div className="flex items-center gap-2">
          <label
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-(--border) px-3 py-1.5 text-[13px] font-[510] text-(--fg) transition-colors hover:bg-(--accent-soft) ${importing ? "pointer-events-none opacity-40" : ""}`}
          >
            <Upload className="h-3.5 w-3.5" />
            {importing ? "导入中…" : "CSV"}
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleCsvUpload}
              disabled={importing}
            />
          </label>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
            <DialogTrigger
              render={
                <Button size="sm">
                  <Plus className="mr-1 h-4 w-4" />
                  添加
                </Button>
              }
            />
            {herbs.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowClearConfirm(true)}
                disabled={clearing}
                className="text-[11px] text-(--muted)"
              >
                清空
              </Button>
            )}
            <DialogContent style={{ borderRadius: "var(--radius-xl-val)" }}>
              <DialogHeader>
                <DialogTitle>{editing ? "编辑药材" : "添加药材"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>名称</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="药材中文名" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>售价 (元/克)</Label>
                    <Input type="number" step="0.01" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>成本价 (元/克)</Label>
                    <Input type="number" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="0.00" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>库存 (克){editing && <span className="ml-1 text-[11px] text-(--muted)">当前 {editing.stock}g，修改后自动生成库存记录</span>}</Label>
                  <Input type="number" step="0.5" min="0" value={stock} onChange={(e) => setStock(e.target.value)} placeholder={editing ? `${editing.stock}` : "初始库存（可选）"} />
                </div>
                {/* Unit settings */}
                <details className="group">
                  <summary className="cursor-pointer text-[13px] text-(--muted) hover:text-(--fg) select-none">
                    替代计量单位（可选）
                  </summary>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[12px]">单位</Label>
                      <select
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="w-full rounded-[var(--radius-sm-val)] border border-(--border) bg-(--bg) px-3 py-1.5 text-[13px]"
                      >
                        <option value="">仅克 (g)</option>
                        <option value="枚">枚</option>
                        <option value="个">个</option>
                        <option value="片">片</option>
                        <option value="升">升</option>
                        <option value="合">合</option>
                        <option value="等分">等分</option>
                      </select>
                    </div>
                    {unit && (
                      <div className="space-y-1.5">
                        <Label className="text-[12px]">1{unit} = ?克</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={unitGrams}
                          onChange={(e) => setUnitGrams(e.target.value)}
                          placeholder="如：1枚≈2.5g"
                          className="text-[13px]"
                        />
                      </div>
                    )}
                  </div>
                </details>
                <Button onClick={save} className="w-full">
                  {editing ? "保存修改" : "添加"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      {herbs.length > 0 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--muted)" />
          <Input
            placeholder="搜索药材（名称或拼音）…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="!h-10 !rounded-[var(--radius-val)] !pl-10"
          />
        </div>
      )}
      </div>

      {/* Herb list — A-Z scroll area */}
      <div className="relative min-h-0 flex-1 overflow-y-auto scrollbar-hide">
      <div className="panel">
        {displayed.length === 0 ? (
          <p className="px-4 py-10 text-center text-[13px] text-(--muted)">
            {herbs.length === 0
              ? "暂无药材。点击「添加」录入药材，或通过 CSV 批量导入。"
              : search
                ? "无匹配结果。"
                : "暂无使用记录。搜索或输入以查看全部药材。"}
          </p>
        ) : (
          <>
            {!search && herbs.length > 20 && (
              <p className="px-4 py-2 text-center text-[11px] text-(--muted)">
                最近使用的 20 种药材（共 {herbs.length} 种，搜索查看全部）
              </p>
            )}
            <AzIndex
              labels={displayed.map((h) => h.name)}
              sectionIdPrefix="herb"
            />
            {groupByFirstLetter(displayed, (h) => h.name).map((group) => (
              <div key={group.letter} id={`herb-${group.letter}`}>
                <div className="sticky top-0 z-10 border-b border-(--border) bg-(--surface) px-4 py-1.5 text-[11px] font-[590] text-(--muted) uppercase">
                  {group.letter}
                </div>
                {group.items.map((herb) => (
            <div
              key={herb.id}
              className="flex items-center justify-between border-b border-(--border) px-4 py-3 last:border-b-0"
            >
              <div>
                <span className="text-[13px] font-medium">{herb.name}</span>
                <span className="ml-1.5 text-[11px] text-(--muted)">
                  {herb.pinyin}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {herb.unit && herb.unitGrams && (
                  <Badge variant="outline" className="text-[11px] font-normal">
                    1{herb.unit}≈{herb.unitGrams}g
                  </Badge>
                )}
                <span className="text-[13px] tabular-nums">
                  ¥{herb.sellPrice.toFixed(2)}
                  <span className="text-[11px] text-(--muted)">/g</span>
                </span>
                <Badge
                  variant={herb.stock < 50 ? "destructive" : "secondary"}
                >
                  {herb.stock}g
                </Badge>
                <div className="flex gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      setEditing(herb);
                      setName(herb.name);
                      setSellPrice(herb.sellPrice.toString());
                      setCostPrice(herb.costPrice.toString());
                      setStock(herb.stock.toString());
                      setUnit(herb.unit || "");
                      setUnitGrams(herb.unitGrams?.toString() || "");
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setDeleteTarget(herb)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
                ))}
              </div>
            ))}
          </>
        )}
      </div>
      </div>

      {/* Clear all confirmation */}
      <ConfirmDialog
        open={showClearConfirm && !deleteTarget}
        onOpenChange={(v) => { if (!v) setShowClearConfirm(false); }}
        title="确认清空"
        message={`确定删除全部 ${herbs.length} 种药材吗？药方明细和模版明细也将一并清空，此操作不可恢复。`}
        confirmLabel="清空全部"
        variant="destructive"
        onConfirm={clearAll}
        loading={clearing}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="确认删除"
        message={`确定删除药材「${deleteTarget?.name}」吗？`}
        confirmLabel="删除"
        variant="destructive"
        onConfirm={() => deleteTarget && remove(deleteTarget.id)}
      />
    </div>
  );
}
