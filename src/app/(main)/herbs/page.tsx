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
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { toPinyin, toPinyinInitials } from "@/lib/pinyin";
import { AzIndex, groupByFirstLetter } from "@/components/ui/az-index";
import { Plus, Pencil, Trash2, Upload } from "lucide-react";

interface Herb {
  id: number;
  name: string;
  pinyin: string;
  sellPrice: number;
  costPrice: number;
  stock: number;
  unit: string | null;
  unitGrams: number | null;
}

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
  const [clearing, setClearing] = useState(false);

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
    fetch("/api/herbs").then((r) => r.json()).then(setHerbs);
  }, []);

  const filtered = herbs.filter((h) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      h.name.includes(q) ||
      h.pinyin.includes(q) ||
      toPinyinInitials(h.name).includes(q)
    );
  });

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
        setHerbs(herbs.filter((h) => h.id !== id));
      }
    } catch {
      toast.error("删除失败");
    } finally {
      setDeleteTarget(null);
    }
  }

  async function clearAll() {
    setClearing(true);
    try {
      const res = await fetch("/api/herbs", { method: "DELETE" });
      const result = await res.json();
      if (res.ok) {
        toast.success(result.message);
        setHerbs([]);
      } else {
        toast.error(result.error || "清空失败");
      }
    } catch {
      toast.error("清空失败");
    } finally {
      setClearing(false);
    }
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
                onClick={() => setClearing(true)}
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
      <Input
        placeholder="搜索药材（名称或拼音）…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      </div>

      {/* Herb list — A-Z scroll area */}
      <div className="relative min-h-0 flex-1 overflow-y-auto scrollbar-hide">
      <div className="panel">
        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-[13px] text-(--muted)">
            暂无药材
          </p>
        ) : (
          <>
            <AzIndex
              labels={filtered.map((h) => h.name)}
              sectionIdPrefix="herb"
            />
            {groupByFirstLetter(filtered, (h) => h.name).map((group) => (
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
      <Dialog open={clearing && !deleteTarget} onOpenChange={(v) => { if (!v) setClearing(false); }}>
        <DialogContent style={{ borderRadius: "var(--radius-xl-val)" }}>
          <DialogHeader>
            <DialogTitle>确认清空</DialogTitle>
          </DialogHeader>
          <p className="text-[14px] text-(--fg-secondary)">
            确定删除全部 {herbs.length} 种药材吗？药方明细和模版明细也将一并清空，此操作不可恢复。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearing(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={clearAll}>
              清空全部
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent style={{ borderRadius: "var(--radius-xl-val)" }}>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-[14px] text-(--fg-secondary)">
            确定删除药材「{deleteTarget?.name}」吗？
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && remove(deleteTarget.id)}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
