"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { toPinyin, toPinyinInitials } from "@/lib/pinyin";
import { formatDate, getEvaluationColor } from "@/lib/utils";
import {
  ChevronRight,
  MessageSquarePlus,
  Trash2,
} from "lucide-react";

interface PrescriptionItem {
  id: number;
  grams: number;
  unitPrice: number;
  herb: { name: string };
}

interface Prescription {
  id: number;
  patientId: number | null;
  totalPrice: number;
  totalCost: number;
  createdAt: string;
  patient: { name: string } | null;
  items: PrescriptionItem[];
}

interface FollowUp {
  id: number;
  prescriptionId: number;
  evaluation: string;
  note: string | null;
  createdAt: string;
}

interface Patient {
  id: number;
  name: string;
}

const EVALUATIONS = [
  { value: "痊愈", label: "痊愈" },
  { value: "显效", label: "显效" },
  { value: "有效", label: "有效" },
  { value: "无效", label: "无效" },
  { value: "加重", label: "加重" },
];

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [patientFilterId, setPatientFilterId] = useState<number | null>(null);
  const [patientFilterName, setPatientFilterName] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [selected, setSelected] = useState<Prescription | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [newEvaluation, setNewEvaluation] = useState("");
  const [newNote, setNewNote] = useState("");
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Prescription | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [clearing, setClearing] = useState(false);

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

  const loadFollowUps = (prescriptionId: number) => {
    fetch(`/api/follow-ups?prescriptionId=${prescriptionId}`)
      .then((r) => r.json())
      .then(setFollowUps)
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
      p.items.some((i) => i.herb.name.includes(search));
    return matchPatient && matchSearch;
  });

  const patientOptions: ComboboxOption<Patient>[] = patients.map((p) => ({
    key: p.id,
    label: p.name,
    searchTokens: [toPinyin(p.name), toPinyinInitials(p.name)],
    data: p,
  }));

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
        toast.error("删除失败");
      }
    } catch {
      toast.error("删除失败");
    } finally {
      setDeleting(false);
    }
  };

  async function clearAll() {
    setClearing(true);
    try {
      const res = await fetch("/api/prescriptions", { method: "DELETE" });
      const result = await res.json();
      if (res.ok) {
        toast.success(result.message);
        setPrescriptions([]);
      } else {
        toast.error(result.error || "清空失败");
      }
    } catch {
      toast.error("清空失败");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-[590] tracking-[-0.01em]">历史药方</h1>
        {prescriptions.length > 0 && (
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

      {/* Filters */}
      <div className="panel p-3 space-y-2">
        <Input
          placeholder="搜索病人或药材…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-[12px] text-(--muted)">按病人：</span>
          {patientFilterName ? (
            <div className="flex items-center gap-2 rounded-[var(--radius-pill)] border border-(--border) bg-(--accent-soft) px-3 py-1">
              <span className="text-[13px] font-medium">{patientFilterName}</span>
              <button
                type="button"
                onClick={() => {
                  setPatientFilterId(null);
                  setPatientFilterName("");
                  setPatientSearch("");
                }}
                className="text-[11px] text-(--muted) underline"
              >
                清除
              </button>
            </div>
          ) : (
            <InlineCombobox<Patient>
              options={patientOptions}
              placeholder="全部病人"
              value={patientSearch}
              onChange={setPatientSearch}
              maxResults={5}
              inputClassName="!h-9 !text-[13px]"
              onSelect={(opt) => {
                setPatientFilterId(opt.data!.id);
                setPatientFilterName(opt.data!.name);
                setPatientSearch("");
              }}
            />
          )}
        </div>
      </div>

      {/* Prescription list */}
      <div className="panel overflow-hidden">
        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-[13px] text-(--muted)">
            暂无药方记录
          </p>
        ) : (
          filtered.map((p, i) => (
            <button
              key={p.id}
              onClick={() => openDetail(p)}
              className="flex w-full items-center justify-between border-b border-(--border) px-4 py-3 text-left transition-colors hover:bg-(--accent-soft) last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-(--fg)">
                    {p.patient?.name || "散客"}
                  </span>
                  <span className="text-[11px] text-(--muted)">
                    {formatDate(p.createdAt)}
                  </span>
                </div>
                <div className="mt-0.5 flex gap-1.5">
                  {p.items.slice(0, 4).map((item) => (
                    <span key={item.id} className="text-[11px] text-(--muted)">
                      {item.herb.name}
                    </span>
                  ))}
                  {p.items.length > 4 && (
                    <span className="text-[11px] text-(--muted)">
                      +{p.items.length - 4}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[15px] font-[590] tabular-nums">
                  ¥{p.totalPrice.toFixed(2)}
                </span>
                <ChevronRight className="h-4 w-4 text-(--muted)" />
              </div>
            </button>
          ))
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent
          className="max-h-[85vh] max-w-sm overflow-y-auto"
          style={{
            borderRadius: "var(--radius-xl-val)",
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {selected?.patient?.name || "散客"} 的药方
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-5">
              <div className="flex items-center justify-between text-[12px] text-(--muted)">
                <span>
                  {formatDate(selected.createdAt, "full")}
                </span>
                <div className="flex items-center gap-3">
                  <span>
                    {selected.items.length} 味药
                  </span>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(selected)}
                    className="inline-flex items-center gap-1 text-[11px] text-(--danger) hover:underline"
                  >
                    <Trash2 className="h-3 w-3" />
                    删除
                  </button>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-1">
                {selected.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-[8px] bg-(--accent-soft) px-3 py-2 text-[13px]"
                  >
                    <span className="font-medium">{item.herb.name}</span>
                    <div className="flex items-center gap-3 text-(--muted)">
                      <span>{item.grams}g</span>
                      <span>¥{item.unitPrice.toFixed(2)}/g</span>
                      <span className="font-medium text-(--fg)">
                        ¥{(item.grams * item.unitPrice).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-(--muted)">总价</span>
                <span className="text-[18px] font-[590]">
                  ¥{selected.totalPrice.toFixed(2)}
                </span>
              </div>

              {/* Follow-ups */}
              <div className="space-y-3 border-t border-(--border) pt-4">
                <h4 className="flex items-center gap-2 text-[13px] font-[510]">
                  <MessageSquarePlus className="h-4 w-4" />
                  随访记录
                </h4>

                {followUps.map((f) => (
                  <div
                    key={f.id}
                    className="rounded-[8px] border border-(--border) bg-(--bg) p-3 text-[13px]"
                  >
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={getEvaluationColor(f.evaluation)}
                      >
                        {f.evaluation}
                      </Badge>
                      <span className="text-[11px] text-(--muted)">
                        {new Date(f.createdAt).toLocaleString("zh-CN", {
                          month: "2-digit",
                          day: "2-digit",
                        })}
                      </span>
                    </div>
                    {f.note && (
                      <p className="mt-2 text-(--muted)">{f.note}</p>
                    )}
                  </div>
                ))}
                {followUps.length === 0 && (
                  <p className="text-[12px] text-(--muted)">暂无随访</p>
                )}

                {/* Add follow-up */}
                <div className="space-y-3 rounded-[8px] border border-(--border) bg-(--bg) p-3">
                  <p className="text-[11px] font-[510] text-(--muted)">
                    添加随访
                  </p>
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
        </DialogContent>
      </Dialog>

      {/* Clear all confirmation */}
      <Dialog open={clearing && !deleteTarget} onOpenChange={(v) => { if (!v) setClearing(false); }}>
        <DialogContent style={{ borderRadius: "var(--radius-xl-val)" }}>
          <DialogHeader>
            <DialogTitle>确认清空</DialogTitle>
          </DialogHeader>
          <p className="text-[14px] text-(--fg-secondary)">
            确定删除全部 {prescriptions.length} 条药方吗？药材库存将自动退回，此操作不可恢复。
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
            确定删除「{deleteTarget?.patient?.name || "散客"}」的药方吗？药材库存会自动退回。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={deletePrescription}
              disabled={deleting}
            >
              {deleting ? "删除中…" : "删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
