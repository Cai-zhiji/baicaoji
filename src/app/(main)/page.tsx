"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  InlineCombobox,
  type ComboboxOption,
} from "@/components/ui/inline-combobox";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  X,
  Loader2,
  Save,
  ClipboardList,
  Plus,
  Trash2,
  User,
  Leaf,
  BookOpen,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { Herb, Patient, PrescriptionItem, Template } from "@/lib/types";
import { herbToOption, patientToOption, templateToOption } from "@/lib/option-factory";
import { cn } from "@/lib/utils";

/* ── Page ── */

export default function PrescriptionPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [herbs, setHerbs] = useState<Herb[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [saving, setSaving] = useState(false);

  const [patientSearch, setPatientSearch] = useState("");
  const [herbSearch, setHerbSearch] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");

  const [patientSheetOpen, setPatientSheetOpen] = useState(false);
  const [templateSheetOpen, setTemplateSheetOpen] = useState(false);

  const [tplDialogOpen, setTplDialogOpen] = useState(false);
  const [tplName, setTplName] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // 新建病人时的性别选择
  const [genderDialogOpen, setGenderDialogOpen] = useState(false);
  const [pendingNewName, setPendingNewName] = useState("");

  const [loading, setLoading] = useState(true);

  const itemsEndRef = useRef<HTMLDivElement>(null);
  const loadedRxRef = useRef(false);

  /* ── Data loading ── */

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch("/api/herbs").then((r) => r.json()),
      fetch("/api/patients").then((r) => r.json()),
      fetch("/api/templates").then((r) => r.json()),
    ])
      .then(([herbsData, patientsData, templatesData]) => {
        if (cancelled) return;
        setHerbs(herbsData);
        setPatients(patientsData);
        setTemplates(templatesData);
        setLoading(false);

        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const pid = params.get("patientId");
          const pname = params.get("patientName");
          const rxId = params.get("rxId");
          if (pid) {
            const p = patientsData.find((x: Patient) => x.id === parseInt(pid));
            if (p) {
              setSelectedPatient(p);
            } else if (pname) {
              setSelectedPatient({ id: parseInt(pid), name: pname, gender: "男", age: null, phone: null });
            }
          }
          if (rxId && !loadedRxRef.current) {
            loadedRxRef.current = true;
            fetch(`/api/prescriptions/${rxId}`)
              .then((r) => r.json())
              .then((rx) => {
                if (rx.items) {
                  setItems(
                    rx.items.map((i: { herbId: number | null; herbName: string; herb?: { name: string } | null; grams: number; unitPrice: number; unitCost: number }) => ({
                      herbId: i.herbId ?? null,
                      herbName: i.herb?.name ?? i.herbName,
                      grams: i.grams,
                      unitPrice: i.unitPrice,
                      unitCost: i.unitCost,
                    }))
                  );
                  toast.info(`已加载历史药方（${rx.items.length} 味药），可修改后保存`);
                }
              })
              .catch(() => {});
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("加载数据失败");
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  /* ── Patient ── */

  const patientOptions: ComboboxOption<Patient>[] = patients.map(p =>
    patientToOption(p, <span className="text-[11px]">{p.gender} {p.age ? `· ${p.age}岁` : ""}</span>)
  );

  function handleSelectPatient(opt: ComboboxOption<Patient>) {
    setSelectedPatient(opt.data!);
    setPatientSearch("");
    setPatientSheetOpen(false);
  }

  async function createPatientWithGender(name: string, gender: "男" | "女") {
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, gender }),
      });
      if (res.ok) {
        const p: Patient = await res.json();
        setPatients((prev) => [...prev, p]);
        setSelectedPatient(p);
        setPatientSearch("");
        setPatientSheetOpen(false);
        toast.success(`已创建病人：${p.name}`);
      } else {
        const err = await res.json();
        if (err.existingPatient) {
          setSelectedPatient(err.existingPatient);
          setPatientSearch("");
          setPatientSheetOpen(false);
          toast.info(`已选择已有病人：${err.existingPatient.name}`);
        } else {
          toast.error(err.error || "创建失败");
        }
      }
    } catch {
      toast.error("创建失败");
    }
  }

  /* ── Herb ── */

  const herbOptions: ComboboxOption<Herb>[] = herbs.map(h => {
    const stockBadge =
      h.stock >= 100 ? null : (
        <Badge
          variant={h.stock < 30 ? "destructive" : "secondary"}
          className={cn(
            "text-[10px]",
            h.stock >= 30 && h.stock < 100 && "bg-(--warn-soft) text-(--warn)"
          )}
        >
          {h.stock}g
        </Badge>
      );
    return herbToOption(h, (
      <span className="flex items-center gap-2 text-[11px]">
        <span>¥{h.sellPrice.toFixed(2)}/g</span>
        {stockBadge}
      </span>
    ));
  });

  function addHerb(opt: ComboboxOption<Herb>) {
    const herb = opt.data!;
    if (items.find((i) => i.herbId === herb.id)) {
      toast.info(`${herb.name} 已在药方中`);
      return;
    }
    setItems([
      ...items,
      { herbId: herb.id, herbName: herb.name, grams: 0, unitPrice: herb.sellPrice, unitCost: herb.costPrice },
    ]);
    setHerbSearch("");
    setTimeout(() => itemsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  function updateGrams(index: number, grams: number) {
    const updated = [...items];
    updated[index].grams = isNaN(grams) ? 0 : grams;
    setItems(updated);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  const totalPrice = items.reduce((sum, i) => sum + i.unitPrice * i.grams, 0);

  function getStockLevel(item: PrescriptionItem): "ok" | "warn" | "danger" {
    const herb = herbs.find((h) => h.id === item.herbId);
    if (!herb) return "ok";
    if (item.grams > herb.stock || herb.stock < 30) return "danger";
    if (herb.stock < 100) return "warn";
    return "ok";
  }

  /* ── Save ── */

  async function savePrescription() {
    if (items.length === 0) {
      toast.error("药方为空，请添加药材");
      return;
    }
    if (items.some((i) => i.grams <= 0)) {
      toast.error("请为每味药材填写克数");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient?.id ?? null,
          items: items.map((i) => ({
            herbId: i.herbId || null,
            herbName: i.herbName,
            grams: i.grams,
            unitPrice: i.unitPrice,
          })),
          totalPrice,
        }),
      });
      if (res.ok) {
        toast.success("药方已保存");
        setItems([]);
        setSelectedPatient(null);
        fetch("/api/herbs").then((r) => r.json()).then(setHerbs);
      } else {
        const err = await res.json();
        toast.error(err.error || "保存失败");
      }
    } catch {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  }

  /* ── Template ── */

  const sortedTemplates = [...templates].sort((a, b) => {
    const aTime = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
    const bTime = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
    return bTime - aTime;
  });

  function loadTemplate(template: Template) {
    const existingNames = new Set(items.map((i) => i.herbName));
    let unmatchedCount = 0;
    const newItems: PrescriptionItem[] = template.items
      .filter((t) => {
        if (existingNames.has(t.herbName)) return false;
        existingNames.add(t.herbName);
        return true;
      })
      .map((t) => {
        const herb = t.herbId
          ? herbs.find((h) => h.id === t.herbId)
          : herbs.find((h) => h.name === t.herbName);
        if (!herb) unmatchedCount++;
        return {
          herbId: herb?.id ?? null,
          herbName: t.herbName,
          grams: t.grams ?? 0,
          unitPrice: herb?.sellPrice ?? 0,
          unitCost: herb?.costPrice ?? 0,
        };
      });
    setItems(prev => [...prev, ...newItems]);
    setTemplateSearch("");
    setTemplateSheetOpen(false);
    const msg = `已加载模版：${template.name}（${newItems.length} 味药）`;
    if (unmatchedCount > 0) {
      toast.success(msg, { description: `${unmatchedCount} 味药材未录入系统，单价为 0，请手动调整` });
    } else {
      toast.success(msg);
    }
    setTimeout(() => itemsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

    fetch(`/api/templates/${template.id}`, { method: "PATCH" }).catch(() => {});
    setTemplates((prev) =>
      prev.map((t) => (t.id === template.id ? { ...t, lastUsedAt: new Date().toISOString() } : t))
    );
  }

  async function saveAsTemplate() {
    if (items.length === 0) {
      toast.error("药方为空");
      return;
    }
    setTplName("");
    setTplDialogOpen(true);
  }

  async function confirmSaveTemplate() {
    if (!tplName.trim()) {
      toast.error("请输入模版名称");
      return;
    }
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tplName.trim(),
          items: items.map((i) => ({ herbId: i.herbId, herbName: i.herbName, grams: i.grams })),
        }),
      });
      if (res.ok) {
        const t = await res.json();
        setTemplates([...templates, t]);
        toast.success("模版已保存");
        setTplDialogOpen(false);
      } else {
        toast.error("保存模版失败");
      }
    } catch {
      toast.error("保存模版失败");
    }
  }

  /* ── Render ── */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-(--muted)" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 pb-20">
      {/* ── 顶部工具条：搜索 + 病人/模版 icon ── */}
      <div
        className="sticky top-0 z-10 -mx-4 flex items-center gap-2 border-b border-(--border) px-4 py-2"
        style={{ background: "var(--bg)" }}
      >
        <div className="flex-1">
          <InlineCombobox<Herb>
            options={herbOptions}
            onSelect={addHerb}
            placeholder="搜索药材（拼音或汉字）…"
            value={herbSearch}
            onChange={setHerbSearch}
            maxResults={6}
            showAllOnEmpty={false}
          />
        </div>
        {/* 病人图标按钮 */}
        <button
          type="button"
          onClick={() => setPatientSheetOpen(true)}
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-(--accent-soft)"
          style={{ color: selectedPatient ? "var(--accent)" : "var(--muted)" }}
          aria-label="选择病人"
        >
          <User className="h-[18px] w-[18px]" strokeWidth={selectedPatient ? 2.2 : 1.75} />
          {selectedPatient && (
            <span
              className="absolute bottom-1 h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--accent)" }}
            />
          )}
        </button>
        {/* 模版图标按钮 */}
        <button
          type="button"
          onClick={() => setTemplateSheetOpen(true)}
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-(--accent-soft)"
          style={{ color: "var(--muted)" }}
          aria-label="载入模版"
        >
          <BookOpen className="h-[18px] w-[18px]" strokeWidth={1.75} />
          {templates.length > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[16px] rounded-full px-1 text-[9px] font-[600] leading-[16px] tabular-nums text-white"
              style={{ background: "var(--muted)" }}
            >
              {templates.length > 99 ? "99+" : templates.length}
            </span>
          )}
        </button>
      </div>

      {/* ── 病人条（仅选中后显示） ── */}
      {selectedPatient && (
        <div
          className="flex items-center justify-between rounded-[var(--radius-val)] px-3 py-2"
          style={{ background: "var(--accent-soft)" }}
        >
          <div className="flex min-w-0 items-center gap-2 text-[13px]">
            <User className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--accent)" }} />
            <span className="truncate font-[510]" style={{ color: "var(--fg)" }}>
              {selectedPatient.name}
            </span>
            <span className="shrink-0 text-[12px]" style={{ color: "var(--fg-secondary)" }}>
              {selectedPatient.gender}
              {selectedPatient.age ? ` · ${selectedPatient.age}岁` : ""}
            </span>
          </div>
          <button
            onClick={() => setSelectedPatient(null)}
            className="rounded-full p-1 transition-colors hover:bg-(--accent-soft-strong)"
            aria-label="取消关联病人"
          >
            <X className="h-3.5 w-3.5" style={{ color: "var(--fg-secondary)" }} />
          </button>
        </div>
      )}

      {/* ── 药方明细 ── */}
      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
          <span className="text-[13px] font-[510]">
            药方明细
            {items.length > 0 && (
              <span className="ml-1.5 text-[11px] text-(--muted)">
                {items.length} 味
              </span>
            )}
          </span>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={saveAsTemplate}
              disabled={items.length === 0}
            >
              <ClipboardList className="mr-1 h-3.5 w-3.5" />
              存模版
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowClearConfirm(true)}
              disabled={items.length === 0}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              清空
            </Button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12">
            <Leaf
              className="mb-3 h-10 w-10"
              style={{ color: "var(--muted)", opacity: 0.5 }}
              strokeWidth={1.5}
            />
            <p className="text-center text-[13px] leading-relaxed text-(--muted)">
              从上方搜索药材开始开方
              <br />
              或点击右上&nbsp;
              <BookOpen className="inline h-3.5 w-3.5 -mt-0.5" strokeWidth={1.75} />
              &nbsp;载入模版
            </p>
          </div>
        ) : (
          <div className="divide-y divide-(--border)/60">
            {items.map((item, idx) => {
              const level = getStockLevel(item);
              return (
                <div
                  key={item.herbId || `${item.herbName}-${idx}`}
                  className={cn(
                    "relative px-3 py-2.5",
                    level === "danger" && "stock-bar-danger",
                    level === "warn" && "stock-bar-warn"
                  )}
                >
                  {/* 第一行：药名 + 删除 */}
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[14px] font-[510] text-(--fg)">
                      {item.herbName}
                    </span>
                    <button
                      onClick={() => removeItem(idx)}
                      className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-(--danger-soft)"
                      aria-label="删除"
                    >
                      <X className="h-3.5 w-3.5 text-(--muted)" />
                    </button>
                  </div>
                  {/* 第二行：克数 × 单价 = 小计 */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex items-center">
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        value={item.grams || ""}
                        onChange={(e) => updateGrams(idx, parseFloat(e.target.value) || 0)}
                        className="h-10 w-20 pr-6 text-center text-[14px] font-[510] tabular-nums"
                        placeholder="0"
                      />
                      <span className="pointer-events-none absolute right-2 text-[11px] text-(--muted)">
                        g
                      </span>
                    </div>
                    <span className="text-[12px] text-(--muted) tabular-nums">
                      × ¥{item.unitPrice.toFixed(2)}/g
                    </span>
                    <span className="ml-auto text-[15px] font-[590] tabular-nums text-(--fg)">
                      ¥{(item.unitPrice * item.grams).toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={itemsEndRef} />
          </div>
        )}
      </div>

      {/* ── 吸底保存条：总价 + 保存 ── */}
      <div className="fixed inset-x-0 bottom-[var(--tabbar-h)] z-20 sticky-bottom-bar">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-2.5">
          <div className="flex flex-col leading-tight">
            <span className="text-[11px] text-(--muted)">总价</span>
            <span className="text-[22px] font-[620] tabular-nums tracking-[-0.02em] text-(--fg)">
              ¥{totalPrice.toFixed(2)}
            </span>
          </div>
          <Button
            onClick={savePrescription}
            disabled={saving || items.length === 0}
            size="lg"
            className="ml-auto h-11 flex-1 max-w-[180px] rounded-full font-[510] tracking-[0.02em]"
          >
            {saving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            保存药方
          </Button>
        </div>
      </div>

      {/* ── 选病人抽屉 ── */}
      <Sheet open={patientSheetOpen} onOpenChange={setPatientSheetOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[80dvh] rounded-t-[var(--radius-xl-val)] pb-[env(safe-area-inset-bottom,12px)]"
        >
          <SheetHeader className="pb-2">
            <SheetTitle>关联病人</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            <InlineCombobox<Patient>
              options={patientOptions}
              onSelect={handleSelectPatient}
              placeholder="搜索病人姓名或拼音…"
              value={patientSearch}
              onChange={setPatientSearch}
              maxResults={6}
              showAllOnEmpty
              autoFocus
              renderEmpty={(q) => (
                <button
                  type="button"
                  onClick={() => {
                    setPendingNewName(q);
                    setGenderDialogOpen(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-[var(--radius-sm-val)] px-3 py-2.5 text-[14px] text-(--accent) transition-colors hover:bg-(--accent-soft)"
                >
                  <Plus className="h-4 w-4" />
                  新建&ldquo;{q}&rdquo;
                </button>
              )}
            />
            <p className="mt-3 text-center text-[11px] text-(--muted)">
              不选病人则记为散客（可关闭本弹窗）
            </p>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── 选模版抽屉 ── */}
      <Sheet open={templateSheetOpen} onOpenChange={setTemplateSheetOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[80dvh] rounded-t-[var(--radius-xl-val)] pb-[env(safe-area-inset-bottom,12px)]"
        >
          <SheetHeader className="pb-2">
            <SheetTitle>载入模版</SheetTitle>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
            {templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <BookOpen className="mb-2 h-8 w-8 text-(--muted) opacity-50" strokeWidth={1.5} />
                <p className="text-[13px] text-(--muted)">暂无模版</p>
                <p className="mt-1 text-[11px] text-(--muted)">
                  开方后点「存模版」保存组合
                </p>
              </div>
            ) : (
              <>
                <InlineCombobox<Template>
                  options={sortedTemplates.map(t =>
                    templateToOption(t, <span className="text-[11px] text-(--muted)">{t.items.length} 味</span>)
                  )}
                  onSelect={(opt) => loadTemplate(opt.data!)}
                  placeholder="搜索模版（拼音或汉字）…"
                  value={templateSearch}
                  onChange={setTemplateSearch}
                  maxResults={8}
                  showAllOnEmpty={false}
                  autoFocus
                />
                <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
                  <div className="mb-1.5 px-1 text-[11px] font-[510] uppercase tracking-[0.05em] text-(--muted)">
                    最近使用
                  </div>
                  <div className="space-y-1">
                    {sortedTemplates.slice(0, 8).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => loadTemplate(t)}
                        className="flex w-full items-center justify-between rounded-[var(--radius-sm-val)] px-3 py-2.5 text-left transition-colors hover:bg-(--accent-soft)"
                      >
                        <span className="truncate text-[14px] font-medium">{t.name}</span>
                        <span className="ml-2 shrink-0 text-[11px] text-(--muted)">
                          {t.items.length} 味
                          {t.lastUsedAt && (
                            <span className="ml-1.5">
                              {new Date(t.lastUsedAt).toLocaleDateString("zh-CN", {
                                month: "2-digit",
                                day: "2-digit",
                              })}
                            </span>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── 新建病人性别选择 ── */}
      <Dialog open={genderDialogOpen} onOpenChange={setGenderDialogOpen}>
        <DialogContent style={{ borderRadius: "var(--radius-xl-val)" }}>
          <DialogHeader>
            <DialogTitle>新建病人「{pendingNewName}」</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-[13px] text-(--muted)">请选择性别（其他信息可稍后在病人页补充）</p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  setGenderDialogOpen(false);
                  createPatientWithGender(pendingNewName, "男");
                }}
              >
                男
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  setGenderDialogOpen(false);
                  createPatientWithGender(pendingNewName, "女");
                }}
              >
                女
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── 保存为模版对话框 ── */}
      <Dialog open={tplDialogOpen} onOpenChange={setTplDialogOpen}>
        <DialogContent style={{ borderRadius: "var(--radius-xl-val)" }}>
          <DialogHeader>
            <DialogTitle>保存为模版</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>模版名称</Label>
              <Input
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                placeholder="如：补中益气汤"
                onKeyDown={(e) => { if (e.key === "Enter") confirmSaveTemplate(); }}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTplDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={confirmSaveTemplate}>
                保存
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── 清空确认 ── */}
      <ConfirmDialog
        open={showClearConfirm}
        onOpenChange={(v) => { if (!v) setShowClearConfirm(false); }}
        title="确认清空"
        message="确定清空当前药方吗？所有已添加的药材将被清除。"
        confirmLabel="清空"
        variant="destructive"
        onConfirm={() => {
          setItems([]);
          setShowClearConfirm(false);
        }}
      />
    </div>
  );
}
