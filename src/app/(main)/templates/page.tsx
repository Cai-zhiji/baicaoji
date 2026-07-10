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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  InlineCombobox,
  type ComboboxOption,
} from "@/components/ui/inline-combobox";
import { toast } from "sonner";
import { toPinyin, toPinyinInitials } from "@/lib/pinyin";
import { AzIndex, groupByFirstLetter } from "@/components/ui/az-index";
import { Trash2, BookOpen, Upload, Search, Plus, Pencil, X } from "lucide-react";

/* ── Types ── */

interface Herb {
  id: number;
  name: string;
  pinyin: string;
  sellPrice: number;
  stock: number;
  unit: string | null;
  unitGrams: number | null;
}

interface Template {
  id: number;
  name: string;
  lastUsedAt: string | null;
  items: { herbId: number; herbName: string; grams: number }[];
}

interface DraftItem {
  herbId: number;
  herbName: string;
  grams: number;
  useAltUnit: boolean; // 是否使用替代单位（枚/个等）显示
  altUnit: string | null;
  unitGrams: number | null;
}

/* ── Helpers ── */

function herbToOption(h: Herb): ComboboxOption<Herb> {
  return {
    key: h.id,
    label: h.name,
    searchTokens: [h.pinyin, toPinyinInitials(h.name)],
    meta: (
      <span className="flex items-center gap-2 text-[11px]">
        <span>¥{h.sellPrice.toFixed(2)}/g</span>
        {h.unit && h.unitGrams && (
          <Badge variant="outline" className="text-[10px] font-normal">
            1{h.unit}≈{h.unitGrams}g
          </Badge>
        )}
        <Badge variant={h.stock < 50 ? "destructive" : "secondary"} className="text-[10px]">
          {h.stock}g
        </Badge>
      </span>
    ),
    data: h,
  };
}

/* ── Page ── */

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [herbs, setHerbs] = useState<Herb[]>([]);
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);

  // Add / Edit dialog
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [tplName, setTplName] = useState("");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [herbSearch, setHerbSearch] = useState("");

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [clearing, setClearing] = useState(false);

  /* ── Data ── */

  const loadTemplates = () => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then(setTemplates);
  };

  useEffect(() => {
    loadTemplates();
    fetch("/api/herbs")
      .then((r) => r.json())
      .then(setHerbs);
  }, []);

  /* ── CSV ── */

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/templates/import", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(result.message || "导入成功");
        loadTemplates();
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

  /* ── Add / Edit ── */

  function openAdd() {
    setEditing(null);
    setTplName("");
    setDraftItems([]);
    setHerbSearch("");
    setOpen(true);
  }

  function openEdit(t: Template) {
    setEditing(t);
    setTplName(t.name);
    setDraftItems(
      t.items.map((i) => {
        const herb = herbs.find((h) => h.id === i.herbId);
        return {
          herbId: i.herbId,
          herbName: i.herbName,
          grams: i.grams,
          useAltUnit: false,
          altUnit: herb?.unit ?? null,
          unitGrams: herb?.unitGrams ?? null,
        };
      })
    );
    setHerbSearch("");
    setOpen(true);
  }

  function reset() {
    setTplName("");
    setDraftItems([]);
    setHerbSearch("");
    setEditing(null);
  }

  function addHerbToDraft(opt: ComboboxOption<Herb>) {
    const herb = opt.data!;
    if (draftItems.find((d) => d.herbId === herb.id)) {
      toast.info(`${herb.name} 已在模版中`);
      return;
    }
    setDraftItems([
      ...draftItems,
      {
        herbId: herb.id,
        herbName: herb.name,
        grams: 0,
        useAltUnit: !!herb.unit, // 默认使用替代单位（如果药材配置了）
        altUnit: herb.unit ?? null,
        unitGrams: herb.unitGrams ?? null,
      },
    ]);
    setHerbSearch("");
  }

  function updateDraftGrams(index: number, value: number) {
    const updated = [...draftItems];
    const item = updated[index];
    if (item.useAltUnit && item.unitGrams) {
      // 输入的是替代单位数量，转换为克存储
      item.grams = value * item.unitGrams;
    } else {
      item.grams = value;
    }
    setDraftItems(updated);
  }

  /** 切换克/替代单位 */
  function toggleUnit(index: number) {
    const updated = [...draftItems];
    const item = updated[index];
    if (!item.altUnit || !item.unitGrams) return;
    item.useAltUnit = !item.useAltUnit;
    setDraftItems(updated);
  }

  /** 获取当前显示的数值 */
  function getDisplayValue(item: DraftItem): number {
    if (item.useAltUnit && item.unitGrams && item.unitGrams > 0) {
      return parseFloat((item.grams / item.unitGrams).toFixed(1));
    }
    return item.grams;
  }

  /** 获取当前显示的单位 */
  function getDisplayUnit(item: DraftItem): string {
    if (item.useAltUnit && item.altUnit) return item.altUnit;
    return "g";
  }

  function removeDraftItem(index: number) {
    setDraftItems(draftItems.filter((_, i) => i !== index));
  }

  async function save() {
    if (!tplName.trim()) {
      toast.error("请输入模版名称");
      return;
    }
    if (draftItems.length === 0) {
      toast.error("请至少添加一味药材");
      return;
    }

    const url = editing
      ? `/api/templates/${editing.id}`
      : "/api/templates";
    const method = editing ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tplName.trim(),
          items: draftItems.map((d) => ({ herbId: d.herbId, grams: d.grams })),
        }),
      });

      if (res.ok) {
        toast.success(editing ? "模版已更新" : "模版已创建");
        setOpen(false);
        reset();
        loadTemplates();
      } else {
        const err = await res.json();
        toast.error(err.error || "保存失败");
      }
    } catch {
      toast.error("保存失败");
    }
  }

  /* ── Delete ── */

  async function remove(id: number) {
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("模版已删除");
        setTemplates(templates.filter((t) => t.id !== id));
      }
    } catch {
      toast.error("删除失败");
    } finally {
      setDeleteTarget(null);
      setClearing(false);
    }
  }

  async function clearAll() {
    setClearing(true);
    try {
      const res = await fetch("/api/templates", { method: "DELETE" });
      const result = await res.json();
      if (res.ok) {
        toast.success(result.message);
        setTemplates([]);
      } else {
        toast.error(result.error || "清空失败");
      }
    } catch {
      toast.error("清空失败");
    } finally {
      setClearing(false);
    }
  }

  /* ── Filter ── */

  const herbOptions: ComboboxOption<Herb>[] = herbs.map(herbToOption);

  // 最近使用的排前面；无搜索时只展示最近 5 个
  const templatesSorted = [...templates].sort((a, b) => {
    const aTime = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
    const bTime = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
    return bTime - aTime;
  });

  const filtered = templatesSorted.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.name.includes(q) ||
      toPinyin(t.name).includes(q) ||
      toPinyinInitials(t.name).includes(q)
    );
  });

  // 无搜索时只展示最近 5 个（或有使用记录的模板）
  const displayed = search
    ? filtered
    : filtered.filter((t) => t.lastUsedAt).slice(0, 5);

  /* ── Render ── */

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 space-y-3 pb-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-[590] tracking-[-0.01em]">
          药方模版
          {templates.length > 0 && (
            <span className="ml-2 text-[13px] font-normal text-(--muted)">
              {templates.length} 个
            </span>
          )}
        </h1>
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
          <Button size="sm" onClick={openAdd}>
            <Plus className="mr-1 h-4 w-4" />
            新建
          </Button>
          {templates.length > 0 && (
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
        </div>
      </div>

      {/* Search */}
      {templates.length > 0 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--muted)" />
          <Input
            placeholder="搜索模版（名称或拼音）…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="!h-10 !rounded-[var(--radius-val)] !pl-10"
          />
        </div>
      )}
      </div>

      {/* Template list — A-Z scroll area */}
      <div className="relative min-h-0 flex-1 overflow-y-auto scrollbar-hide">
      <div className="panel">
        {displayed.length === 0 ? (
          <p className="px-4 py-10 text-center text-[13px] text-(--muted)">
            {templates.length === 0
              ? "暂无模版。点击「新建」创建模版，或通过 CSV 批量导入。"
              : search
                ? "无匹配结果。"
                : "暂无使用记录。搜索或输入以查看全部模版。"}
          </p>
        ) : (
          <>
            {!search && templates.filter((t) => t.lastUsedAt).length > 5 && (
              <p className="px-4 py-2 text-center text-[11px] text-(--muted)">
                最近使用的 5 个模版
                {templates.filter((t) => !t.lastUsedAt).length > 0 &&
                  `（另有 ${templates.filter((t) => !t.lastUsedAt).length} 个未使用，搜索查看全部）`}
              </p>
            )}
            <AzIndex
              labels={displayed.map((t) => t.name)}
              sectionIdPrefix="tpl"
            />
            {groupByFirstLetter(displayed, (t) => t.name).map((group) => (
              <div key={group.letter} id={`tpl-${group.letter}`}>
                <div className="sticky top-0 z-10 border-b border-(--border) bg-(--surface) px-4 py-1.5 text-[11px] font-[590] text-(--muted) uppercase">
                  {group.letter}
                </div>
          <div className="divide-y divide-(--border)">
            {group.items.map((t) => (
              <div key={t.id} className="px-4 py-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5 shrink-0 text-(--muted)" />
                      <span className="text-[14px] font-[510]">{t.name}</span>
                      <span className="text-[11px] text-(--muted)">
                        {t.items.length} 味药
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {t.items.map((item) => {
                        const herb = herbs.find((h) => h.id === item.herbId);
                        const showAlt = herb?.unit && herb?.unitGrams && herb.unitGrams > 0 && item.grams > 0;
                        const altVal = showAlt ? (item.grams / herb!.unitGrams!).toFixed(1) : null;
                        return (
                        <Badge
                          key={item.herbId}
                          variant="secondary"
                          className="text-[12px]"
                        >
                          {item.herbName}
                          {item.grams > 0 && (
                            <span className="ml-0.5 font-[510] tabular-nums">
                              {showAlt
                                ? `${altVal}${herb!.unit}`
                                : `${item.grams}g`
                              }
                            </span>
                          )}
                        </Badge>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEdit(t)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setDeleteTarget(t)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
              </div>
            ))}
          </>
        )}
      </div>
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent style={{ borderRadius: "var(--radius-xl-val)" }} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "编辑模版" : "新建模版"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Template name */}
            <div className="space-y-2">
              <Label>模版名称</Label>
              <Input
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                placeholder="如：补中益气汤"
                autoFocus
              />
            </div>

            {/* Herb search */}
            <div className="space-y-2">
              <Label>添加药材</Label>
              <InlineCombobox<Herb>
                options={herbOptions}
                onSelect={addHerbToDraft}
                placeholder="搜索药材（拼音或汉字）…"
                value={herbSearch}
                onChange={setHerbSearch}
                maxResults={5}
                showAllOnEmpty={false}
              />
            </div>

            {/* Draft items */}
            {draftItems.length > 0 && (
              <div className="space-y-2">
                <Label>药材列表（{draftItems.length} 味）</Label>
                <div className="max-h-[240px] space-y-1.5 overflow-y-auto">
                  {draftItems.map((item, idx) => {
                    const displayVal = getDisplayValue(item);
                    const displayUnit = getDisplayUnit(item);
                    return (
                    <div
                      key={item.herbId}
                      className="flex items-center gap-2 rounded-[var(--radius-sm-val)] border border-(--border) px-3 py-2"
                    >
                      <span className="min-w-0 flex-1 text-[13px] font-medium truncate">
                        {item.herbName}
                      </span>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          step={displayUnit === "g" ? "0.5" : "1"}
                          min="0"
                          value={displayVal || ""}
                          onChange={(e) => updateDraftGrams(idx, parseFloat(e.target.value) || 0)}
                          className="h-8 w-20 text-[13px]"
                          placeholder={displayUnit === "g" ? "克数" : displayUnit}
                        />
                        {item.altUnit && (
                          <button
                            type="button"
                            onClick={() => toggleUnit(idx)}
                            className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-[510] transition-colors ${
                              item.useAltUnit
                                ? "bg-(--accent) text-(--accent-fg)"
                                : "bg-(--accent-soft) text-(--muted) hover:text-(--fg)"
                            }`}
                            title={`切换为${item.useAltUnit ? "克" : item.altUnit}`}
                          >
                            {displayUnit}
                          </button>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => removeDraftItem(idx)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Button onClick={save} className="w-full">
              {editing ? "保存修改" : "创建模版"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear all confirmation */}
      <Dialog open={clearing && !deleteTarget} onOpenChange={(v) => { if (!v) setClearing(false); }}>
        <DialogContent style={{ borderRadius: "var(--radius-xl-val)" }}>
          <DialogHeader>
            <DialogTitle>确认清空</DialogTitle>
          </DialogHeader>
          <p className="text-[14px] text-(--fg-secondary)">
            确定删除全部 {templates.length} 个模版吗？此操作不可恢复。
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
            确定删除模版「{deleteTarget?.name}」吗？
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
