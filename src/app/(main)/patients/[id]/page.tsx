"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDate, getEvaluationColor } from "@/lib/utils";
import { ArrowLeft, PenLine, Copy, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FollowUp {
  id: number;
  evaluation: string;
  note: string | null;
  createdAt: string;
}

interface PrescriptionItem {
  id: number;
  grams: number;
  unitPrice: number;
  herb: { name: string };
}

interface Prescription {
  id: number;
  totalPrice: number;
  totalCost: number;
  createdAt: string;
  items: PrescriptionItem[];
  followUps: FollowUp[];
}

interface Patient {
  id: number;
  name: string;
  gender: string;
  age: number | null;
  phone: string | null;
  createdAt: string;
  prescriptions: Prescription[];
}

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);

  useEffect(() => {
    fetch(`/api/patients/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          toast.error(data.error);
          router.push("/patients");
        } else {
          setPatient(data);
        }
      })
      .catch(() => toast.error("加载病人信息失败"));
  }, [params.id, router]);

  if (!patient) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-(--muted)">加载中…</p>
      </div>
    );
  }

  const totalPrescriptions = patient.prescriptions.length;
  const totalSpent = patient.prescriptions.reduce(
    (sum, p) => sum + p.totalPrice,
    0
  );

  /** 复制药方内容到剪贴板 */
  function copyPrescription(p: Prescription) {
    const text = p.items
      .map((i) => `${i.herb.name} ${i.grams}g`)
      .join("、");
    navigator.clipboard.writeText(text).then(
      () => toast.success("药方已复制"),
      () => toast.error("复制失败")
    );
  }

  /** 跳转到开方页，预填相同药材 */
  function rePrescribe(p: Prescription) {
    const params = new URLSearchParams();
    params.set("patientId", patient!.id.toString());
    params.set("patientName", patient!.name);
    params.set("rxId", p.id.toString());
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="space-y-3">
      <Link
        href="/patients"
        className="inline-flex items-center gap-1 rounded-full border border-(--border) px-3 py-1.5 text-[13px] font-[510] text-(--muted) transition-colors hover:bg-(--accent-soft) hover:text-(--fg)"
      >
        <ArrowLeft className="h-4 w-4" />
        返回
      </Link>

      {/* Patient info */}
      <div className="panel p-4">
        <div className="flex items-start justify-between">
          <h1 className="text-[18px] font-[590] tracking-[-0.01em]">
            {patient.name}
          </h1>
          <Link href={`/?patientId=${patient.id}&patientName=${encodeURIComponent(patient.name)}`}>
            <Button size="sm" variant="outline">
              <PenLine className="mr-1 h-3.5 w-3.5" />
              开新方
            </Button>
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
          <div>
            <span className="text-(--muted)">性别</span>
            <p className="font-medium">{patient.gender}</p>
          </div>
          <div>
            <span className="text-(--muted)">年龄</span>
            <p className="font-medium">{patient.age ?? "-"}</p>
          </div>
          <div>
            <span className="text-(--muted)">电话</span>
            <p className="font-medium">{patient.phone ?? "-"}</p>
          </div>
          <div>
            <span className="text-(--muted)">累计药方</span>
            <p className="font-medium">{totalPrescriptions} 条</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-(--border) pt-3 text-[13px]">
          <span className="text-(--muted)">累计药费</span>
          <span className="text-[18px] font-[590] tabular-nums">
            ¥{totalSpent.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Prescription history */}
      <h2 className="text-[15px] font-[590]">历史药方</h2>
      {patient.prescriptions.length === 0 ? (
        <div className="panel px-4 py-8 text-center text-[13px] text-(--muted)">
          暂无药方记录
        </div>
      ) : (
        <div className="space-y-2">
          {patient.prescriptions.map((p) => (
            <div key={p.id} className="panel overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[12px] text-(--muted)">
                  {formatDate(p.createdAt)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); copyPrescription(p); }}
                    className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] px-2 py-1 text-[11px] text-(--muted) transition-colors hover:bg-(--accent-soft) hover:text-(--fg)"
                    title="复制药方"
                  >
                    <Copy className="h-3 w-3" />
                    复制
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); rePrescribe(p); }}
                    className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] bg-(--accent-soft) px-2 py-1 text-[11px] font-[510] text-(--accent) transition-colors hover:bg-(--accent)"
                    title="再开一次相同方剂"
                  >
                    <RotateCcw className="h-3 w-3" />
                    再开
                  </button>
                  <span className="text-[15px] font-[590] tabular-nums">
                    ¥{p.totalPrice.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 border-t border-(--border) px-4 pt-2 pb-3">
                {p.items.map((item) => (
                  <Badge key={item.id} variant="secondary" className="text-[11px]">
                    {item.herb.name} {item.grams}g
                  </Badge>
                ))}
              </div>

              {/* Follow-ups */}
              {p.followUps.length > 0 && (
                <div className="space-y-1.5 border-t border-(--border) px-4 pt-2 pb-3">
                  {p.followUps.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between rounded-[8px] border border-(--border) bg-(--bg) px-3 py-2 text-[12px]"
                    >
                      <Badge
                        variant="outline"
                        className={getEvaluationColor(f.evaluation)}
                      >
                        {f.evaluation}
                      </Badge>
                      {f.note && (
                        <span className="ml-2 flex-1 truncate text-(--muted)">
                          {f.note}
                        </span>
                      )}
                      <span className="ml-2 text-(--muted)">
                        {new Date(f.createdAt).toLocaleString("zh-CN", {
                          month: "2-digit",
                          day: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
