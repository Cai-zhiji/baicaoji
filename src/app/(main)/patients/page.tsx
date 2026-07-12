"use client";

import { useState, useEffect, useRef } from "react";
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
import { useMutation } from "@/lib/use-mutation";
import { toPinyin, toPinyinInitials } from "@/lib/pinyin";
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  Loader2,
  Users,
  MoreHorizontal,
  ChevronRight,
} from "lucide-react";
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
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const { execute: clearAllPatients, loading: clearing } = useMutation<{ message?: string }>({
    url: "/api/patients",
    method: "DELETE",
    onSuccess: (result) => {
      toast.success(result?.message || "已清空");
      setPatients([]);
    },
    errorMessage: "清空失败",
  });

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

  function openAdd() {
    reset();
    setOpen(true);
  }

  function openEdit(p: Patient) {
    setEditing(p);
    setName(p.name);
    setGender(p.gender);
    setAge(p.age?.toString() ?? "");
    setPhone(p.phone ?? "");
    setOpen(true);
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
    <div className="flex flex-col gap-2 pb-6">
      {/* Sticky header */}
      <div
        className="sticky top-0 z-10 -mx-4 flex flex-col gap-2 border-b border-(--border) px-4 py-2"
        style={{ background: "var(--bg)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h1 className="text-[17px] font-[590] tracking-[-0.01em]">病人管理</h1>
            <span className="text-[12px] text-(--muted) tabular-nums">
              {filtered.length}
              {filtered.length !== patients.length && ` / ${patients.length}`}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" onClick={openAdd}>
              <Plus className="mr-1 h-4 w-4" />
              添加
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
                {patients.length > 0 && (
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

        {patients.length > 0 && (
          <Input
            placeholder="搜索病人（姓名、拼音或电话）…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
      </div>

      {/* List */}
      <div className="panel overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Users
              className="mb-3 h-10 w-10"
              style={{ color: "var(--muted)", opacity: 0.5 }}
              strokeWidth={1.5}
            />
            <p className="text-[13px] text-(--muted)">
              {patients.length === 0 ? "暂无病人，点击「添加」录入" : "无匹配结果"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-(--border)/60">
            {filtered.map((p) => (
              <div key={p.id} className="flex items-center gap-2 px-3 py-2.5">
                <Link
                  href={`/patients/${p.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-[590]"
                    style={{
                      background: p.gender === "女" ? "color-mix(in oklch, var(--danger-soft) 60%, var(--surface))" : "var(--accent-soft)",
                      color: p.gender === "女" ? "var(--danger)" : "var(--accent)",
                    }}
                  >
                    {p.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="truncate text-[14px] font-[510] text-(--fg)">{p.name}</span>
                      <span className="shrink-0 text-[11px] text-(--muted)">
                        {p.gender}{p.age ? ` · ${p.age}岁` : ""}
                      </span>
                    </div>
                    {p.phone && (
                      <div className="mt-0.5 truncate text-[11px] text-(--muted) tabular-nums">
                        {p.phone}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-(--muted)" />
                </Link>
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
                    <DropdownMenuItem onClick={() => openEdit(p)}>
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      编辑
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeleteTarget(p)}
                      className="text-(--danger)"
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / edit dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent style={{ borderRadius: "var(--radius-xl-val)" }}>
          <DialogHeader>
            <DialogTitle>{editing ? "编辑病人" : "添加病人"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>姓名</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="病人姓名" autoFocus />
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
