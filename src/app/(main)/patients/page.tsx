"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { useMutation } from "@/lib/use-mutation";
import { toPinyin, toPinyinInitials } from "@/lib/pinyin";
import { Plus, Pencil, Trash2, Upload, Loader2 } from "lucide-react";
import type { Patient } from "@/lib/types";

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [name, setName] = useState("");
  const [gender, setGender] = useState("男");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [importing, setImporting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const { execute: clearAllPatients, loading: clearing } = useMutation<{ message?: string }>({
    url: "/api/patients",
    method: "DELETE",
    onSuccess: (result) => {
      toast.success(result?.message || "已清空");
      setPatients([]);
    },
    errorMessage: "清空失败",
  });

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);

  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    fetch("/api/patients")
      .then((r) => r.json())
      .then((data) => { setPatients(data); setInitialLoading(false); })
      .catch(() => { toast.error("加载病人列表失败"); setInitialLoading(false); });
  }, []);

  const filtered = patients.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    try {
      return (
        p.name.includes(q) ||
        p.phone?.includes(q) ||
        toPinyin(p.name).includes(q) ||
        toPinyinInitials(p.name).includes(q)
      );
    } catch {
      return p.name.includes(q) || (p.phone?.includes(q) ?? false);
    }
  });

  function reset() {
    setName("");
    setGender("男");
    setAge("");
    setPhone("");
    setEditing(null);
  }

  async function save() {
    if (!name.trim()) {
      toast.error("请输入病人姓名");
      return;
    }
    const url = editing ? `/api/patients/${editing.id}` : "/api/patients";
    const method = editing ? "PUT" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          gender,
          age: age ? parseInt(age) : null,
          phone: phone || null,
        }),
      });
      if (res.ok) {
        toast.success(editing ? "病人已更新" : "病人已添加");
        setOpen(false);
        reset();
        const data = await fetch("/api/patients").then((r) => r.json());
        setPatients(data);
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
      const res = await fetch(`/api/patients/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("病人已删除");
        setPatients((prev) => prev.filter((p) => p.id !== id));
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
    await clearAllPatients();
    setShowClearConfirm(false);
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/patients/import", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(result.message || "导入成功");
        const data = await fetch("/api/patients").then((r) => r.json());
        setPatients(data);
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

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-(--muted)" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-[590] tracking-[-0.01em]">病人管理</h1>
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
          <DialogContent style={{ borderRadius: "var(--radius-xl-val)" }}>
            <DialogHeader>
              <DialogTitle>{editing ? "编辑病人" : "添加病人"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>姓名</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="病人姓名" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>性别</Label>
                  <Select value={gender} onValueChange={(v) => setGender(v || "男")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="男">男</SelectItem>
                      <SelectItem value="女">女</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>年龄</Label>
                  <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="年龄" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>联系电话</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="选填" />
              </div>
              <Button onClick={save} className="w-full">
                {editing ? "保存修改" : "添加"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        {patients.length > 0 && (
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
        </div>
      </div>

      <Input
        placeholder="搜索病人（姓名、拼音或电话）…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="panel overflow-hidden">
        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-[13px] text-(--muted)">
            暂无病人
          </p>
        ) : (
          filtered.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between border-b border-(--border) px-4 py-3 last:border-b-0"
            >
              <Link
                href={`/patients/${p.id}`}
                className="min-w-0 flex-1"
              >
                <span className="text-[13px] font-medium text-(--fg) hover:underline">
                  {p.name}
                </span>
                <span className="ml-2 text-[12px] text-(--muted)">
                  {p.gender} {p.age ? `${p.age}岁` : ""}
                </span>
              </Link>
              <div className="flex gap-0.5 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    setEditing(p);
                    setName(p.name);
                    setGender(p.gender);
                    setAge(p.age?.toString() ?? "");
                    setPhone(p.phone ?? "");
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setDeleteTarget(p)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Clear all confirmation */}
      <ConfirmDialog
        open={showClearConfirm && !deleteTarget}
        onOpenChange={(v) => { if (!v) setShowClearConfirm(false); }}
        title="确认清空"
        message={`确定删除全部 ${patients.length} 位病人吗？此操作不可恢复。`}
        confirmLabel="清空全部"
        variant="destructive"
        onConfirm={clearAll}
        loading={clearing}
      />

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="确认删除"
        message={`确定删除病人「${deleteTarget?.name}」吗？相关药方不会被删除。`}
        confirmLabel="删除"
        variant="destructive"
        onConfirm={() => deleteTarget && remove(deleteTarget.id)}
      />
    </div>
  );
}
