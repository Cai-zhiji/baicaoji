"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  InlineCombobox,
  type ComboboxOption,
} from "@/components/ui/inline-combobox";
import { toast } from "sonner";
import {
  X,
  Loader2,
  Save,
  ClipboardList,
  AlertTriangle,
  Plus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toPinyin, toPinyinInitials } from "@/lib/pinyin";

/* ── Types ── */

interface Herb {
  id: number;
  name: string;
  pinyin: string;
  sellPrice: number;
  stock: number;
}

interface Patient {
  id: number;
  name: string;
  gender: string;
  age: number | null;
}

interface PrescriptionItem {
  herbId: number;
  herbName: string;
  grams: number;
  unitPrice: number;
}

interface Template {
  id: number;
  name: string;
  lastUsedAt: string | null;
  items: { herbId: number; herbName: string; grams: number }[];
}

/* ── Helpers ── */

function patientToOption(p: Patient): ComboboxOption<Patient> {
  return {
    key: p.id,
    label: p.name,
    searchTokens: [toPinyin(p.name), toPinyinInitials(p.name)],
    meta: (
      <span className="text-[11px]">
        {p.gender} {p.age ? `· ${p.age}岁` : ""}
      </span>
    ),
    data: p,
  };
}

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

function templateToOption(t: Template): ComboboxOption<Template> {
  const herbCount = t.items.length;
  return {
    key: t.id,
    label: t.name,
    searchTokens: [toPinyin(t.name), toPinyinInitials(t.name)],
    meta: (
      <span className="text-[11px] text-(--muted)">
        {herbCount} 味药
      </span>
    ),
    data: t,
  };
}

/* ── Page ── */

export default function PrescriptionPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [herbs, setHerbs] = useState<Herb[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [saving, setSaving] = useState(false);

  // Combobox values (uncontrolled, cleared on select)
  const [patientSearch, setPatientSearch] = useState("");
  const [herbSearch, setHerbSearch] = useState("");
  const [tplDialogOpen, setTplDialogOpen] = useState(false);
  const [tplName, setTplName] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");
  const patientInputRef = useRef<HTMLInputElement>(null);
  const herbInputRef = useRef<HTMLInputElement>(null);

  const itemsEndRef = useRef<HTMLDivElement>(null);
  const loadedRxRef = useRef(false); // 防止 StrictMode 双重加载

  /* ── Data loading ── */

  useEffect(() => {
    fetch("/api/herbs")
      .then((r) => r.json())
      .then(setHerbs)
      .catch(() => toast.error("加载药材失败"));
    fetch("/api/patients")
      .then((r) => r.json())
      .then((data) => {
        setPatients(data);
        // Pre-select patient from URL query param
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const pid = params.get("patientId");
          const pname = params.get("patientName");
          const rxId = params.get("rxId");
          if (pid) {
            const p = data.find((x: Patient) => x.id === parseInt(pid));
            if (p) {
              setSelectedPatient(p);
            } else if (pname) {
              setSelectedPatient({ id: parseInt(pid), name: pname, gender: "男", age: null });
            }
          }
          // Pre-fill from existing prescription（防止 StrictMode 双重加载）
          if (rxId && !loadedRxRef.current) {
            loadedRxRef.current = true;
            fetch(`/api/prescriptions/${rxId}`)
              .then((r) => r.json())
              .then((rx) => {
                if (rx.items) {
                  setItems(
                    rx.items.map((i: { herbId: number; herb: { name: string }; grams: number; unitPrice: number }) => ({
                      herbId: i.herbId,
                      herbName: i.herb.name,
                      grams: i.grams,
                      unitPrice: i.unitPrice,
                    }))
                  );
                  toast.info(`已加载历史药方（${rx.items.length} 味药），可修改后保存`);
                }
              })
              .catch(() => {});
          }
        }
      })
      .catch(() => {});
    fetch("/api/templates")
      .then((r) => r.json())
      .then(setTemplates)
      .catch(() => {});
  }, []);

  /* ── Patient ── */

  const patientOptions: ComboboxOption<Patient>[] = patients.map(patientToOption);

  function handleSelectPatient(opt: ComboboxOption<Patient>) {
    setSelectedPatient(opt.data!);
    setPatientSearch("");
    patientInputRef.current?.blur();
  }

  async function quickCreatePatient(name: string) {
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, gender: "男" }),
      });
      if (res.ok) {
        const p: Patient = await res.json();
        setPatients((prev) => [...prev, p]);
        setSelectedPatient(p);
        setPatientSearch("");
        toast.success(`已创建病人：${p.name}`);
      } else {
        const err = await res.json();
        if (err.existingPatient) {
          setSelectedPatient(err.existingPatient);
          setPatientSearch("");
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

  const herbOptions: ComboboxOption<Herb>[] = herbs.map(herbToOption);

  function addHerb(opt: ComboboxOption<Herb>) {
    const herb = opt.data!;
    if (items.find((i) => i.herbId === herb.id)) {
      toast.info(`${herb.name} 已在药方中`);
      return;
    }
    setItems([
      ...items,
      { herbId: herb.id, herbName: herb.name, grams: 0, unitPrice: herb.sellPrice },
    ]);
    setHerbSearch("");
    setTimeout(() => itemsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  function updateGrams(index: number, grams: number) {
    const updated = [...items];
    updated[index].grams = grams;
    setItems(updated);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  const totalPrice = items.reduce((sum, i) => sum + i.unitPrice * i.grams, 0);

  function getStockWarning(item: PrescriptionItem): string | null {
    const herb = herbs.find((h) => h.id === item.herbId);
    if (!herb) return null;
    if (item.grams > herb.stock) {
      return `库存仅 ${herb.stock}g`;
    }
    if (herb.stock < 50) {
      return `低库存 ${herb.stock}g`;
    }
    return null;
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
            herbId: i.herbId,
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
        // Refresh herb stock
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

  function loadTemplate(template: Template) {
    const existingIds = new Set(items.map((i) => i.herbId));
    const newItems: PrescriptionItem[] = template.items
      .filter((t) => !existingIds.has(t.herbId))
      .map((t) => {
        const herb = herbs.find((h) => h.id === t.herbId);
        return {
          herbId: t.herbId,
          herbName: t.herbName,
          grams: t.grams ?? 0,
          unitPrice: herb?.sellPrice ?? 0,
        };
      });
    setItems([...items, ...newItems]);
    setTemplateSearch("");
    toast.success(`已加载模版：${template.name}（${newItems.length} 味药）`);
    setTimeout(() => itemsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

    // 标记模版被使用
    fetch(`/api/templates/${template.id}`, { method: "PATCH" }).catch(() => {});
    // 乐观更新本地状态
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
          items: items.map((i) => ({ herbId: i.herbId, grams: i.grams })),
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

  return (
    <div className="flex flex-col gap-3">
      {/* ── Patient ── */}
      <div className="panel p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-[510] text-(--muted)">
            {selectedPatient
              ? `病人：${selectedPatient.name}${selectedPatient.gender ? ` ${selectedPatient.gender}` : ""}${selectedPatient.age ? ` · ${selectedPatient.age}岁` : ""}`
              : "关联病人（可选）"}
          </span>
          {selectedPatient && (
            <button
              onClick={() => {
                setSelectedPatient(null);
                setPatientSearch("");
              }}
              className="text-[11px] text-(--muted) underline hover:text-(--fg)"
            >
              取消
            </button>
          )}
        </div>

        <InlineCombobox<Patient>
          options={patientOptions}
          onSelect={handleSelectPatient}
          placeholder="搜索病人姓名或拼音…"
          value={patientSearch}
          onChange={setPatientSearch}
          maxResults={5}
          renderEmpty={(q) => (
            <button
              type="button"
              onClick={() => quickCreatePatient(q)}
              className="flex w-full items-center gap-2 rounded-[var(--radius-sm-val)] px-3 py-2.5 text-[14px] text-(--accent) transition-colors hover:bg-(--accent-soft)"
            >
              <Plus className="h-4 w-4" />
              新建&ldquo;{q}&rdquo;
            </button>
          )}
          inputClassName="!h-10"
        />
      </div>

      {/* ── Herb search ── */}
      <div className="sticky top-0 z-10 -mx-4 px-4 pb-2" style={{ background: "var(--bg)" }}>
        <InlineCombobox<Herb>
          options={herbOptions}
          onSelect={addHerb}
          placeholder="搜索药材（拼音或汉字）…"
          value={herbSearch}
          onChange={setHerbSearch}
          maxResults={5}
          showAllOnEmpty={false}
        />
      </div>

      {/* ── Template search ── */}
      <div className="panel p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-[510] text-(--muted)">
            {templates.length > 0
              ? `模版（${templates.length} 个）`
              : "暂无模版"}
          </span>
        </div>
        <InlineCombobox<Template>
          options={templates
            .sort((a, b) => {
              // 最近使用的排前面
              const aTime = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
              const bTime = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
              return bTime - aTime;
            })
            .map(templateToOption)}
          onSelect={(opt) => loadTemplate(opt.data!)}
          placeholder="搜索药方模版（拼音或汉字）…"
          value={templateSearch}
          onChange={setTemplateSearch}
          maxResults={6}
          showAllOnEmpty={false}
          emptyState={
            templates
              .sort((a, b) => {
                const aTime = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
                const bTime = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
                return bTime - aTime;
              })
              .slice(0, 5)
              .map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => loadTemplate(t)}
                  className="flex w-full items-center justify-between rounded-[var(--radius-sm-val)] px-3 py-2.5 text-[14px] transition-colors hover:bg-(--accent-soft)"
                >
                  <span className="font-medium">{t.name}</span>
                  <span className="text-[11px] text-(--muted)">
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
              ))
          }
        />
      </div>

      {/* ── Prescription items ── */}
      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-3">
          <span className="text-[13px] font-[510]">药方明细</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={saveAsTemplate}
            disabled={items.length === 0}
          >
            <ClipboardList className="mr-1 h-3.5 w-3.5" />
            存模版
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="px-4 py-10 text-center text-[13px] text-(--muted)">
            搜索并添加药材，开始开方
          </p>
        ) : (
          <div className="px-4 pb-4">
            {/* Column header */}
            <div className="grid grid-cols-12 items-center gap-2 border-b border-(--border) py-2 text-[11px] font-[510] uppercase tracking-[0.05em] text-(--muted)">
              <div className="col-span-4">药材</div>
              <div className="col-span-2">克数</div>
              <div className="col-span-2">单价</div>
              <div className="col-span-3">小计</div>
              <div className="col-span-1" />
            </div>

            {items.map((item, idx) => {
              const warning = getStockWarning(item);
              return (
                <div
                  key={item.herbId}
                  className="grid grid-cols-12 items-center gap-2 border-b border-(--border)/50 py-1.5"
                >
                  <div className="col-span-4">
                    <span className="text-[13px] font-medium">{item.herbName}</span>
                    {warning && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 text-[11px] text-(--danger)">
                        <AlertTriangle className="h-3 w-3" />
                        {warning}
                      </span>
                    )}
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      value={item.grams || ""}
                      onChange={(e) => updateGrams(idx, parseFloat(e.target.value) || 0)}
                      className="h-8 text-[13px]"
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-2 text-[12px] text-(--muted)">
                    ¥{item.unitPrice.toFixed(2)}
                  </div>
                  <div className="col-span-3 text-[13px] tabular-nums">
                    ¥{(item.unitPrice * item.grams).toFixed(2)}
                  </div>
                  <div className="col-span-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => removeItem(idx)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
            <div ref={itemsEndRef} />

            {/* Total */}
            <div className="flex items-center justify-between border-t border-(--border) py-3">
              <span className="text-[13px] font-[510] text-(--muted)">药方总价</span>
              <span className="text-[28px] font-[620] tracking-[-0.02em] tabular-nums">
                ¥{totalPrice.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Save ── */}
      <Button
        onClick={savePrescription}
        disabled={saving || items.length === 0}
        size="lg"
        className="h-12 w-full rounded-full font-[510] tracking-[0.02em]"
      >
        {saving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        保存药方
      </Button>

      {/* Save template dialog */}
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
    </div>
  );
}
