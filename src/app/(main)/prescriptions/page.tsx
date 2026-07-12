"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  InlineCombobox,
  type ComboboxOption,
} from "@/components/ui/inline-combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useMutation } from "@/lib/use-mutation";
import { formatDate, getEvaluationColor } from "@/lib/utils";
import {
  ChevronRight,
  Copy,
  MessageSquarePlus,
  RotateCcw,
  Trash2,
  MoreHorizontal,
  User,
  X,
  ScrollText,
} from "lucide-react";
import type { Patient, FollowUp, Prescription } from "@/lib/types";
import { patientToOption } from "@/lib/option-factory";

const EVALUATIONS = [
  { value: "痊愈", label: "痊愈" },
  { value: "显效", label: "显效" },
  { value: "有效", label: "有效" },
  { value: "无效", label: "无效" },
  { value: "加重", label: "加重" },
];

export default function PrescriptionsPage() {
  const router = useRouter();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [patientFilterId, setPatientFilterId] = useState<number | null>(null);
  const [patientFilterName, setPatientFilterName] = useState("");
  const [patientPickerOpen, setPatientPickerOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [selected, setSelected] = useState<Prescription | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [newEvaluation, setNewEvaluation] = useState("");
  const [newNote, setNewNote] = useState("");
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Prescription | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const { execute: clearAllPrescriptions, loading: clearing } = useMutation<{ message?: string }>({
    url: "/api/prescriptions",
    method: "DELETE",
    onSuccess: (result) => {
      toast.success(result?.message || "已清空");
      setPrescriptions([]);
    },
    errorMessage: "清空失败",
  });

  const loadData = () => {
    fetch("/api/prescriptions?take=200")
      .then((r) => r.json())
      .then(setPrescriptions)
      .catch(() => toast.error("加载药方失败"));
    fetch("/api/patients")
      .then((r) => r.json())
      .then(setPatients);
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedRxRef = useRef<number | null>(null);

  const loadFollowUps = (prescriptionId: number) => {
    selectedRxRef.current = prescriptionId;
    fetch(`/api/follow-ups?prescriptionId=${prescriptionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (selectedRxRef.current === prescriptionId) {
          setFollowUps(data);
        }
      })
      .catch(() => {});
  };

  const openDetail = (p: Prescription) => {
    setSelected(p);
    setFollowUps([]);
    setNewEvaluation("");
    setNewNote("");
    loadFollowUps(p.id);
    setDetailOpen(true);
  };

  const filtered = prescriptions.filter((p) => {
    const matchPatient =
      patientFilterId === null || p.patientId === patientFilterId;
    const matchSearch =
      !search ||
      (p.patient?.name || "散客").includes(search) ||
      p.items.some((i) => (i.herb?.name ?? i.herbName).includes(search));
    return matchPatient && matchSearch;
  });

  const patientOptions: ComboboxOption<Patient>[] = patients.map(p => patientToOption(p));

  const saveFollowUp = async () => {
    if (!selected || !newEvaluation) {
      toast.error("请选择效果评价");
      return;
    }
    setSavingFollowUp(true);
    try {
      const res = await fetch("/api/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prescriptionId: selected.id,
          evaluation: newEvaluation,
          note: newNote || null,
        }),
      });
      if (res.ok) {
        toast.success("随访记录已保存");
        setNewEvaluation("");
        setNewNote("");
        loadFollowUps(selected.id);
      } else {
        const err = await res.json();
        toast.error(err.error || "保存失败");
      }
    } catch {
      toast.error("保存失败");
    } finally {
      setSavingFollowUp(false);
    }
  };

  const deletePrescription = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/prescriptions/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("药方已删除");
        setDetailOpen(false);
        setDeleteTarget(null);
        loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "删除失败");
      }
    } catch {
      toast.error("删除失败");
    } finally {
      setDeleting(false);
    }
  };

  function rePrescribe(p: Prescription) {
    const params = new URLSearchParams();
    params.set("rxId", p.id.toString());
    router.push(`/?${params.toString()}`);
  }

  async function copyPrescription(p: Prescription) {
    const text = p.items
      .map((item) => `${item.herb?.name ?? item.herbName} ${item.grams}g`)
      .join("、");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("药方已复制到剪贴板");
    } catch {
      toast.error("复制失败，请手动复制");
    }
  }

  async function clearAll() {
    await clearAllPrescriptions();
    setShowClearConfirm(false);
  }

  return (
    <div className="flex flex-col gap-2 pb-6">
      {/* Sticky header */}
      <div
        className="sticky top-0 z-10 -mx-4 flex flex-col gap-2 border-b border-(--border) px-4 py-2"
        style={{ background: "var(--bg)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h1 className="text-[17px] font-[590] tracking-[-0.01em]">历史药方</h1>
            <span className="text-[12px] text-(--muted) tabular-nums">
              {filtered.length}
              {filtered.length !== prescriptions.length && ` / ${prescriptions.length}`}
            </span>
          </div>
          {prescriptions.length > 0 && (
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
                  onClick={() => setShowClearConfirm(true)}
                  className="text-(--danger)"
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  清空全部
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Input
              placeholder="搜索病人或药材…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {patientFilterName ? (
            <div
              className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5"
              style={{ background: "var(--accent-soft)" }}
            >
              <User className="h-3 w-3" style={{ color: "var(--accent)" }} />
              <span className="max-w-[64px] truncate text-[12px] font-[510]">
                {patientFilterName}
              </span>
              <button
                type="button"
                onClick={() => {
                  setPatientFilterId(null);
                  setPatientFilterName("");
                }}
                aria-label="清除病人筛选"
              >
                <X className="h-3 w-3 text-(--muted)" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPatientPickerOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-(--muted) transition-colors hover:bg-(--accent-soft)"
              aria-label="按病人筛选"
            >
              <User className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="panel overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <ScrollText
              className="mb-3 h-10 w-10"
              style={{ color: "var(--muted)", opacity: 0.5 }}
              strokeWidth={1.5}
            />
            <p className="text-[13px] text-(--muted)">
              {prescriptions.length === 0 ? "暂无药方记录" : "无匹配结果"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-(--border)/60">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => openDetail(p)}
                className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-(--accent-soft)"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[14px] font-[510] text-(--fg)">
                      {p.patient?.name || "散客"}
                    </span>
                    <span className="text-[11px] text-(--muted) tabular-nums">
                      {formatDate(p.createdAt)}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-[12px] text-(--muted)">
                    {p.items.slice(0, 4).map((i) => i.herb?.name ?? i.herbName).join(" · ")}
                    {p.items.length > 4 && ` +${p.items.length - 4}`}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[15px] font-[590] tabular-nums text-(--fg)">
                    ¥{p.totalPrice.toFixed(2)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-(--muted)" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Patient filter picker */}
      <Sheet open={patientPickerOpen} onOpenChange={setPatientPickerOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[70dvh] rounded-t-[var(--radius-xl-val)] pb-[env(safe-area-inset-bottom,12px)]"
        >
          <SheetHeader className="pb-2">
            <SheetTitle>按病人筛选</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            <InlineCombobox<Patient>
              options={patientOptions}
              placeholder="搜索病人姓名或拼音…"
              value={patientSearch}
              onChange={setPatientSearch}
              maxResults={8}
              showAllOnEmpty
              autoFocus
              onSelect={(opt) => {
                setPatientFilterId(opt.data!.id);
                setPatientFilterName(opt.data!.name);
                setPatientSearch("");
                setPatientPickerOpen(false);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Detail sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[90dvh] overflow-y-auto rounded-t-[var(--radius-xl-val)] pb-[env(safe-area-inset-bottom,12px)]"
        >
          <SheetHeader className="pb-2">
            <SheetTitle>
              {selected?.patient?.name || "散客"} · 药方详情
            </SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="space-y-4 px-4 pb-4">
              {/* Meta + action bar */}
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-(--muted)">
                  {formatDate(selected.createdAt, "full")} · {selected.items.length} 味
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => copyPrescription(selected)}
                    className="inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-[12px] text-(--muted) transition-colors hover:bg-(--accent-soft) hover:text-(--fg)"
                  >
                    <Copy className="h-3 w-3" />
                    复制
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDetailOpen(false); rePrescribe(selected); }}
                    className="inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-[12px] text-(--accent) transition-colors hover:bg-(--accent-soft)"
                  >
                    <RotateCcw className="h-3 w-3" />
                    再开
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(selected)}
                    className="inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-[12px] text-(--danger) transition-colors hover:bg-(--danger-soft)"
                  >
                    <Trash2 className="h-3 w-3" />
                    删除
                  </button>
                </div>
              </div>

              {/* Items */}
              <div className="rounded-[var(--radius-val)] border border-(--border) overflow-hidden divide-y divide-(--border)/60">
                {selected.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-3 py-2.5"
                  >
                    <span className="text-[13px] font-[510]">{item.herb?.name ?? item.herbName}</span>
                    <div className="flex items-center gap-3 text-[12px] text-(--muted) tabular-nums">
                      <span>{item.grams}g</span>
                      <span>¥{item.unitPrice.toFixed(2)}/g</span>
                      <span className="text-[13px] font-[590] text-(--fg)">
                        ¥{(item.grams * item.unitPrice).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between rounded-[var(--radius-val)] bg-(--accent-soft) px-3 py-2.5">
                <span className="text-[13px] text-(--fg-secondary)">总价</span>
                <span className="text-[22px] font-[620] tabular-nums tracking-[-0.02em] text-(--fg)">
                  ¥{selected.totalPrice.toFixed(2)}
                </span>
              </div>

              {/* Follow-ups */}
              <div className="space-y-2 border-t border-(--border) pt-4">
                <h4 className="flex items-center gap-2 text-[13px] font-[510]">
                  <MessageSquarePlus className="h-4 w-4" />
                  随访记录
                  {followUps.length > 0 && (
                    <span className="text-[11px] text-(--muted)">
                      {followUps.length}
                    </span>
                  )}
                </h4>

                {followUps.length === 0 ? (
                  <p className="py-2 text-[12px] text-(--muted)">暂无随访</p>
                ) : (
                  <div className="space-y-2">
                    {followUps.map((f) => (
                      <div
                        key={f.id}
                        className="rounded-[var(--radius-sm-val)] border border-(--border) bg-(--bg) p-3 text-[13px]"
                      >
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className={getEvaluationColor(f.evaluation)}>
                            {f.evaluation}
                          </Badge>
                          <span className="text-[11px] text-(--muted) tabular-nums">
                            {new Date(f.createdAt).toLocaleString("zh-CN", {
                              month: "2-digit",
                              day: "2-digit",
                            })}
                          </span>
                        </div>
                        {f.note && <p className="mt-1.5 text-(--muted)">{f.note}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add follow-up */}
                <div className="space-y-2 rounded-[var(--radius-sm-val)] border border-(--border) bg-(--bg) p-3">
                  <p className="text-[11px] font-[510] text-(--muted)">添加随访</p>
                  <Select value={newEvaluation} onValueChange={(v) => setNewEvaluation(v ?? "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="效果评价…" />
                    </SelectTrigger>
                    <SelectContent>
                      {EVALUATIONS.map((e) => (
                        <SelectItem key={e.value} value={e.value}>
                          {e.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="用药反馈…"
                    rows={2}
                  />
                  <Button
                    size="sm"
                    onClick={saveFollowUp}
                    disabled={savingFollowUp}
                    className="w-full"
                  >
                    {savingFollowUp ? "保存中…" : "保存随访"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={showClearConfirm && !deleteTarget}
        onOpenChange={(v) => { if (!v) setShowClearConfirm(false); }}
        title="确认清空"
        message={`确定删除全部 ${prescriptions.length} 条药方吗？药材库存将自动退回，此操作不可恢复。`}
        confirmLabel="清空全部"
        variant="destructive"
        onConfirm={clearAll}
        loading={clearing}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="确认删除"
        message={`确定删除「${deleteTarget?.patient?.name || "散客"}」的药方吗？药材库存会自动退回。`}
        confirmLabel="删除"
        variant="destructive"
        onConfirm={deletePrescription}
        loading={deleting}
      />
    </div>
  );
}
