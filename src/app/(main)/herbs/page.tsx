"use client";

import { useState, useEffect, useRef } from "react";
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { toPinyinInitials } from "@/lib/pinyin";
import { AzIndex, groupByFirstLetter } from "@/components/ui/az-index";
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  Loader2,
  Leaf,
  MoreHorizontal,
} from "lucide-react";
import { useMutation } from "@/lib/use-mutation";
import { cn } from "@/lib/utils";
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
  const [initialLoading, setInitialLoading] = useState(true);
  const csvInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    fetch("/api/herbs")
      .then((r) => r.json())
      .then((data) => { setHerbs(data); setInitialLoading(false); })
      .catch(() => { toast.error("加载药材失败"); setInitialLoading(false); });
  }, []);

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

  function openEdit(herb: Herb) {
    setEditing(herb);
    setName(herb.name);
    setSellPrice(herb.sellPrice.toString());
    setCostPrice(herb.costPrice.toString());
    setStock(herb.stock.toString());
    setUnit(herb.unit || "");
    setUnitGrams(herb.unitGrams?.toString() || "");
    setOpen(true);
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

  /** 库存三档色阶：≥100无 / 30-99黄 / <30红 */
  function stockBadgeClass(stockValue: number): string | null {
    if (stockValue >= 100) return null;
    if (stockValue < 30) return "bg-(--danger-soft) text-(--danger)";
    return "bg-(--warn-soft) text-(--warn)";
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-(--muted)" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col pb-2">
      {/* Sticky header */}
      <div
        className="sticky top-0 z-20 -mx-4 shrink-0 flex flex-col gap-2 border-b border-(--border) px-4 py-2"
        style={{ background: "var(--bg)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h1 className="text-[17px] font-[590] tracking-[-0.01em]">药材管理</h1>
            <span className="text-[12px] text-(--muted) tabular-nums">
              {filtered.length}
              {filtered.length !== herbs.length && ` / ${herbs.length}`}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
              <DialogTrigger
                render={
                  <Button size="sm">
                    <Plus className="mr-1 h-4 w-4" />
                    添加
                  </Button>
                }
              />
              <DialogContent style={{ borderRadius: "var(--radius-xl-val)" }}>
                <DialogHeader>
                  <DialogTitle>{editing ? "编辑药材" : "添加药材"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>名称</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="药材中文名" autoFocus />
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
                    <Label>
                      库存 (克)
                      {editing && (
                        <span className="ml-1 text-[11px] text-(--muted)">
                          当前 {editing.stock}g，修改后自动生成库存记录
                        </span>
                      )}
                    </Label>
                    <Input type="number" step="0.5" min="0" value={stock} onChange={(e) => setStock(e.target.value)} placeholder={editing ? `${editing.stock}` : "初始库存（可选）"} />
                  </div>
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

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="更多操作">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => csvInputRef.current?.click()}
                  disabled={importing}
                >
                  <Upload className="mr-2 h-3.5 w-3.5" />
                  {importing ? "导入中…" : "CSV 导入"}
                </DropdownMenuItem>
                {herbs.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setShowClearConfirm(true)}
                      disabled={clearing}
                      className="text-(--danger)"
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      清空全部
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleCsvUpload}
              disabled={importing}
            />
          </div>
        </div>

        {herbs.length > 0 && (
          <Input
            placeholder="搜索药材（名称或拼音）…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
      </div>

      {/* List — A-Z scroll area */}
      <div className="relative min-h-0 flex-1 overflow-y-auto scrollbar-hide pt-2">
        <div className="panel overflow-hidden">
          {displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Leaf
                className="mb-3 h-10 w-10"
                style={{ color: "var(--muted)", opacity: 0.5 }}
                strokeWidth={1.5}
              />
              <p className="text-center text-[13px] text-(--muted)">
                {herbs.length === 0
                  ? "暂无药材，点击「添加」录入或用 CSV 导入"
                  : search
                  ? "无匹配结果"
                  : "暂无使用记录，搜索查看全部"}
              </p>
            </div>
          ) : (
            <>
              {!search && herbs.length > 20 && (
                <p className="border-b border-(--border) px-4 py-2 text-center text-[11px] text-(--muted)">
                  最近使用的 20 种（共 {herbs.length}）— 搜索可查看全部
                </p>
              )}
              <AzIndex
                labels={displayed.map((h) => h.name)}
                sectionIdPrefix="herb"
              />
              {groupByFirstLetter(displayed, (h) => h.name).map((group) => (
                <div key={group.letter} id={`herb-${group.letter}`}>
                  <div className="sticky top-0 z-10 border-b border-(--border) bg-(--surface)/95 backdrop-blur px-3 py-1 text-[11px] font-[590] text-(--muted) uppercase tracking-wider">
                    {group.letter}
                  </div>
                  <div className="divide-y divide-(--border)/60">
                    {group.items.map((herb) => {
                      const badgeCls = stockBadgeClass(herb.stock);
                      return (
                        <div
                          key={herb.id}
                          className="flex items-center gap-2 px-3 py-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-1.5">
                              <span className="truncate text-[14px] font-[510]">{herb.name}</span>
                              <span className="text-[11px] text-(--muted)">
                                {herb.pinyin}
                              </span>
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-(--muted)">
                              <span className="tabular-nums">
                                ¥{herb.sellPrice.toFixed(2)}/g
                              </span>
                              {herb.unit && herb.unitGrams && (
                                <>
                                  <span>·</span>
                                  <span className="tabular-nums">
                                    1{herb.unit}≈{herb.unitGrams}g
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          {badgeCls ? (
                            <Badge className={cn("shrink-0 tabular-nums", badgeCls)}>
                              {herb.stock}g
                            </Badge>
                          ) : (
                            <span className="shrink-0 text-[12px] text-(--muted) tabular-nums">
                              {herb.stock}g
                            </span>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  aria-label="操作"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              }
                            />
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(herb)}>
                                <Pencil className="mr-2 h-3.5 w-3.5" />
                                编辑
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(herb)}
                                className="text-(--danger)"
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

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
