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
import { Trash2, BookOpen, Upload, Search, Plus, Pencil, X } from "lucide-react";

/* ── Types ── */

interface Herb {
  id: number;
  name: string;
  pinyin: string;
  sellPrice: number;
  stock: number;
}

interface Template {
  id: number;
  name: string;
  items: { herbId: number; herbName: string; grams: number }[];
}

interface DraftItem {
  herbId: number;
  herbName: string;
  grams: number;
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
    setDraftItems(t.items.map((i) => ({ herbId: i.herbId, herbName: i.herbName, grams: i.grams })));
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
    setDraftItems([...draftItems, { herbId: herb.id, herbName: herb.name, grams: 0 }]);
    setHerbSearch("");
  }

  function updateDraftGrams(index: number, grams: number) {
    const updated = [...draftItems];
    updated[index].grams = grams;
    setDraftItems(updated);
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
    }
  }

  /* ── Filter ── */

  const herbOptions: ComboboxOption<Herb>[] = herbs.map(herbToOption);

  const filtered = templates.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.name.includes(q) ||
      toPinyin(t.name).includes(q) ||
      toPinyinInitials(t.name).includes(q)
    );
  });

  /* ── Render ── */

  return (
    <div className="space-y-3">
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

      {/* Template list */}
      <div className="panel overflow-hidden">
        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-[13px] text-(--muted)">
            {templates.length === 0
              ? "暂无模版。点击「新建」创建模版，或通过 CSV 批量导入。"
              : "无匹配结果。"}
          </p>
        ) : (
          <div className="divide-y divide-(--border)">
            {filtered.map((t) => (
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
                      {t.items.map((item) => (
                        <Badge
                          key={item.herbId}
                          variant="secondary"
                          className="text-[12px]"
                        >
                          {item.herbName}
                          {item.grams > 0 && (
                            <span className="ml-0.5 font-[510] tabular-nums">
                              {item.grams}g
                            </span>
                          )}
                        </Badge>
                      ))}
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
        )}
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
                  {draftItems.map((item, idx) => (
                    <div
                      key={item.herbId}
                      className="flex items-center gap-2 rounded-[var(--radius-sm-val)] border border-(--border) px-3 py-2"
                    >
                      <span className="min-w-0 flex-1 text-[13px] font-medium truncate">
                        {item.herbName}
                      </span>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        value={item.grams || ""}
                        onChange={(e) => updateDraftGrams(idx, parseFloat(e.target.value) || 0)}
                        className="h-8 w-20 text-[13px]"
                        placeholder="克数"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => removeDraftItem(idx)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={save} className="w-full">
              {editing ? "保存修改" : "创建模版"}
            </Button>
          </div>
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
