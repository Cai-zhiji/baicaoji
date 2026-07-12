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
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  InlineCombobox,
  type ComboboxOption,
} from "@/components/ui/inline-combobox";
import { toast } from "sonner";
import { useMutation } from "@/lib/use-mutation";
import { toPinyin, toPinyinInitials } from "@/lib/pinyin";
import type { Herb, Template } from "@/lib/types";
import { herbToOption } from "@/lib/option-factory";
import { AzIndex, groupByFirstLetter } from "@/components/ui/az-index";
import {
  Trash2,
  BookOpen,
  Upload,
  Plus,
  Pencil,
  X,
  MoreHorizontal,
} from "lucide-react";

interface DraftItem {
  herbId: number | null;
  herbName: string;
  grams: number;
  useAltUnit: boolean;
  altUnit: string | null;
  unitGrams: number | null;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [herbs, setHerbs] = useState<Herb[]>([]);
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [tplName, setTplName] = useState("");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [herbSearch, setHerbSearch] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const { execute: clearAllTemplates, loading: clearing } = useMutation<{ message?: string }>({
    url: "/api/templates",
    method: "DELETE",
    onSuccess: (result) => {
      toast.success(result?.message || "已清空");
      setTemplates([]);
    },
    errorMessage: "清空失败",
  });

  const loadTemplates = () => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then(setTemplates)
      .catch(() => toast.error("加载模版失败"));
  };

  useEffect(() => {
    loadTemplates();
    fetch("/api/herbs")
      .then((r) => r.json())
      .then(setHerbs)
      .catch(() => toast.error("加载药材失败"));
  }, []);

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
        const herb = i.herbId ? herbs.find((h) => h.id === i.herbId) : undefined;
        return {
          herbId: i.herbId ?? null,
          herbName: i.herbName,
          grams: i.grams,
          useAltUnit: false,
          altUnit: herb?.unit ?? null,
          unitGrams: herb?.unitGrams ?? null,
        };
      }),
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
        useAltUnit: !!herb.unit,
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
      item.grams = value * item.unitGrams;
    } else {
      item.grams = value;
    }
    setDraftItems(updated);
  }

  function toggleUnit(index: number) {
    const updated = [...draftItems];
    const item = updated[index];
    if (!item.altUnit || !item.unitGrams) return;
    item.useAltUnit = !item.useAltUnit;
    setDraftItems(updated);
  }

  function getDisplayValue(item: DraftItem): number {
    if (item.useAltUnit && item.unitGrams && item.unitGrams > 0) {
      return parseFloat((item.grams / item.unitGrams).toFixed(1));
    }
    return item.grams;
  }

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
          items: draftItems.map((d) => ({ herbId: d.herbId || null, herbName: d.herbName, grams: d.grams })),
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

  async function remove(id: number) {
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("模版已删除");
        setTemplates((prev) => prev.filter((t) => t.id !== id));
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
    await clearAllTemplates();
    setShowClearConfirm(false);
  }

  const herbOptions: ComboboxOption<Herb>[] = herbs.map(h => herbToOption(h, (
    <span className="flex items-center gap-2 text-[11px]">
      <span>¥{h.sellPrice.toFixed(2)}/g</span>
      {h.unit && h.unitGrams && (
        <Badge variant="outline" className="text-[10px] font-normal">
          1{h.unit}≈{h.unitGrams}g
        </Badge>
      )}
    </span>
  )));

  const templatesSorted = [...templates].sort((a, b) => {
    const aTime = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
    const bTime = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
    return bTime - aTime;
  });

  const filtered = templatesSorted.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    try {
      return (
        t.name.includes(q) ||
        toPinyin(t.name).includes(q) ||
        toPinyinInitials(t.name).includes(q)
      );
    } catch {
      return t.name.includes(q);
    }
  });

  const displayed = search ? filtered : filtered.slice(0, 20);

  return (
    <div className="flex h-full flex-col pb-2">
      {/* Sticky header */}
      <div
        className="sticky top-0 z-20 -mx-4 shrink-0 flex flex-col gap-2 border-b border-(--border) px-4 py-2"
        style={{ background: "var(--bg)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h1 className="text-[17px] font-[590] tracking-[-0.01em]">药方模版</h1>
            <span className="text-[12px] text-(--muted) tabular-nums">
              {filtered.length}
              {filtered.length !== templates.length && ` / ${templates.length}`}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" onClick={openAdd}>
              <Plus className="mr-1 h-4 w-4" />
              新建
            </Button>
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
                {templates.length > 0 && (
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

        {templates.length > 0 && (
          <Input
            placeholder="搜索模版（名称或拼音）…"
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
              <BookOpen
                className="mb-3 h-10 w-10"
                style={{ color: "var(--muted)", opacity: 0.5 }}
                strokeWidth={1.5}
              />
              <p className="text-center text-[13px] text-(--muted)">
                {templates.length === 0
                  ? "暂无模版，点击「新建」创建或用 CSV 导入"
                  : search
                  ? "无匹配结果"
                  : "暂无使用记录，搜索查看全部"}
              </p>
            </div>
          ) : (
            <>
              {!search && templates.length > 20 && (
                <p className="border-b border-(--border) px-4 py-2 text-center text-[11px] text-(--muted)">
                  最近使用的 20 个（共 {templates.length}）— 搜索可查看全部
                </p>
              )}
              <AzIndex
                labels={displayed.map((t) => t.name)}
                sectionIdPrefix="tpl"
              />
              {groupByFirstLetter(displayed, (t) => t.name).map((group) => (
                <div key={group.letter} id={`tpl-${group.letter}`}>
                  <div className="sticky top-0 z-10 border-b border-(--border) bg-(--surface)/95 backdrop-blur px-3 py-1 text-[11px] font-[590] text-(--muted) uppercase tracking-wider">
                    {group.letter}
                  </div>
                  <div className="divide-y divide-(--border)/60">
                    {group.items.map((t) => (
                      <div key={t.id} className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-3.5 w-3.5 shrink-0 text-(--muted)" />
                          <span className="min-w-0 flex-1 truncate text-[14px] font-[510]">
                            {t.name}
                          </span>
                          <span className="shrink-0 text-[11px] text-(--muted) tabular-nums">
                            {t.items.length} 味
                          </span>
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
                              <DropdownMenuItem onClick={() => openEdit(t)}>
                                <Pencil className="mr-2 h-3.5 w-3.5" />
                                编辑
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(t)}
                                className="text-(--danger)"
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {/* Chips row — 保留信息价值 */}
                        <div className="mt-1.5 ml-5 flex flex-wrap gap-1">
                          {t.items.map((item) => {
                            const herb = item.herbId ? herbs.find((h) => h.id === item.herbId) : undefined;
                            const showAlt = herb?.unit && herb?.unitGrams && herb.unitGrams > 0 && item.grams > 0;
                            const altVal = showAlt ? (item.grams / herb!.unitGrams!).toFixed(1) : null;
                            return (
                              <Badge
                                key={`${item.herbId ?? item.herbName}-${item.grams}`}
                                variant={item.herbExists ? "secondary" : "outline"}
                                className={`text-[11px] ${!item.herbExists ? "border-dashed text-(--muted)" : ""}`}
                              >
                                {item.herbName}
                                {item.grams > 0 && (
                                  <span className="ml-0.5 font-[510] tabular-nums">
                                    {showAlt
                                      ? `${altVal}${herb!.unit}`
                                      : `${item.grams}g`}
                                  </span>
                                )}
                              </Badge>
                            );
                          })}
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

      {/* Add / edit dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent style={{ borderRadius: "var(--radius-xl-val)" }} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "编辑模版" : "新建模版"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>模版名称</Label>
              <Input
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                placeholder="如：补中益气汤"
                autoFocus
              />
            </div>

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

            {draftItems.length > 0 && (
              <div className="space-y-2">
                <Label>药材列表（{draftItems.length} 味）</Label>
                <div className="max-h-[240px] space-y-1.5 overflow-y-auto">
                  {draftItems.map((item, idx) => {
                    const displayVal = getDisplayValue(item);
                    const displayUnit = getDisplayUnit(item);
                    return (
                      <div
                        key={item.herbId || `${item.herbName}-${idx}`}
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
                            className="h-8 w-20 text-[13px] tabular-nums"
                            placeholder={displayUnit === "g" ? "克数" : displayUnit}
                          />
                          {item.altUnit && (
                            <button
                              type="button"
                              onClick={() => toggleUnit(idx)}
                              className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-[510] transition-colors ${
                                item.useAltUnit
                                  ? "bg-(--accent) text-(--on-accent)"
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

      <ConfirmDialog
        open={showClearConfirm && !deleteTarget}
        onOpenChange={(v) => { if (!v) setShowClearConfirm(false); }}
        title="确认清空"
        message={`确定删除全部 ${templates.length} 个模版吗？此操作不可恢复。`}
        confirmLabel="清空全部"
        variant="destructive"
        onConfirm={clearAll}
        loading={clearing}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="确认删除"
        message={`确定删除模版「${deleteTarget?.name}」吗？`}
        confirmLabel="删除"
        variant="destructive"
        onConfirm={() => deleteTarget && remove(deleteTarget.id)}
      />
    </div>
  );
}
