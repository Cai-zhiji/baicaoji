"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  InlineCombobox,
  type ComboboxOption,
} from "@/components/ui/inline-combobox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { useApi } from "@/lib/use-api";
import { toPinyin, toPinyinInitials } from "@/lib/pinyin";
import { Plus, ArrowDown, ArrowUp, Info } from "lucide-react";

interface Herb {
  id: number;
  name: string;
  pinyin: string;
  stock: number;
  costPrice: number;
}

interface StockRecord {
  id: number;
  herbId: number;
  herb: { name: string };
  type: string;
  grams: number;
  unitPrice: number | null;
  createdAt: string;
}

function herbToOption(h: Herb): ComboboxOption<Herb> {
  return {
    key: h.id,
    label: h.name,
    searchTokens: [h.pinyin, toPinyinInitials(h.name)],
    meta: <span className="text-[11px] text-(--muted)">库存 {h.stock}g</span>,
    data: h,
  };
}

export default function InventoryPage() {
  const { data: herbsData, refetch: refetchHerbs } = useApi<Herb[]>("/api/herbs");
  const { data: recordsData, refetch: refetchRecords } = useApi<StockRecord[]>("/api/inventory");
  const herbs = herbsData ?? [];
  const records = recordsData ?? [];
  const [open, setOpen] = useState(false);
  const [selectedHerbId, setSelectedHerbId] = useState<number | null>(null);
  const [selectedHerbName, setSelectedHerbName] = useState("");
  const [grams, setGrams] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [herbSearch, setHerbSearch] = useState("");

  const herbOptions: ComboboxOption<Herb>[] = herbs.map(herbToOption);

  async function stockIn() {
    if (!selectedHerbId || !grams) {
      toast.error("请选择药材并填写克数");
      return;
    }
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          herbId: selectedHerbId,
          grams: parseFloat(grams),
          unitPrice: unitPrice ? parseFloat(unitPrice) : undefined,
        }),
      });
      if (res.ok) {
        toast.success("进货已记录");
        setOpen(false);
        setSelectedHerbId(null);
        setSelectedHerbName("");
        setGrams("");
        setUnitPrice("");
        setHerbSearch("");
        refetchHerbs();
        refetchRecords();
      } else {
        toast.error("进货失败");
      }
    } catch {
      toast.error("进货失败");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-[590] tracking-[-0.01em]">库存管理</h1>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) {
              setSelectedHerbId(null);
              setSelectedHerbName("");
              setGrams("");
              setUnitPrice("");
              setHerbSearch("");
            }
          }}
        >
          <DialogTrigger
            render={
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                进货
              </Button>
            }
          />
          <DialogContent style={{ borderRadius: "var(--radius-xl-val)" }}>
            <DialogHeader>
              <DialogTitle>进货登记</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>药材</Label>
                {selectedHerbName ? (
                  <div className="flex items-center justify-between rounded-[var(--radius-sm-val)] border border-(--border) bg-(--accent-soft) px-3 py-2">
                    <span className="text-[14px] font-medium">{selectedHerbName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedHerbId(null);
                        setSelectedHerbName("");
                        setHerbSearch("");
                      }}
                      className="text-[11px] text-(--muted) underline"
                    >
                      更换
                    </button>
                  </div>
                ) : (
                  <InlineCombobox<Herb>
                    options={herbOptions}
                    placeholder="搜索药材…"
                    value={herbSearch}
                    onChange={setHerbSearch}
                    maxResults={5}
                    inputClassName="!h-10"
                    onSelect={(opt) => {
                      setSelectedHerbId(opt.data!.id);
                      setSelectedHerbName(opt.data!.name);
                      setHerbSearch("");
                    }}
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>进货量 (g)</Label>
                  <Input
                    type="number"
                    value={grams}
                    onChange={(e) => setGrams(e.target.value)}
                    placeholder="克数"
                  />
                </div>
                <div className="space-y-2">
                  <Label>进价 (元/克)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="新成本价"
                  />
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-[var(--radius-sm-val)] bg-(--accent-soft) px-3 py-2 text-[12px] text-(--fg-secondary)">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-(--accent)" />
                保存后将更新该药材的成本价
              </div>
              <Button onClick={stockIn} className="w-full">
                确认进货
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">库存概览</TabsTrigger>
          <TabsTrigger value="records">流水记录</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="mt-3">
          <div className="panel overflow-hidden">
            {herbs.map((herb) => (
              <div
                key={herb.id}
                className="flex items-center justify-between border-b border-(--border) px-4 py-3 last:border-b-0"
              >
                <span className="text-[13px] font-medium">{herb.name}</span>
                <div className="flex items-center gap-4 text-[13px]">
                  <span className="tabular-nums">{herb.stock}g</span>
                  <Badge
                    variant={herb.stock < 50 ? "destructive" : "secondary"}
                  >
                    {herb.stock < 50 ? "不足" : "充足"}
                  </Badge>
                </div>
              </div>
            ))}
            {herbs.length === 0 && (
              <p className="px-4 py-10 text-center text-[13px] text-(--muted)">
                暂无药材
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="records" className="mt-3">
          <div className="panel overflow-hidden">
            {records.length === 0 ? (
              <p className="px-4 py-10 text-center text-[13px] text-(--muted)">
                暂无库存记录
              </p>
            ) : (
              records.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between border-b border-(--border) px-4 py-3 last:border-b-0"
                >
                  <div>
                    <span className="text-[13px] font-medium">
                      {r.herb.name}
                    </span>
                    <span className="ml-2 text-[11px] text-(--muted)">
                      {formatDate(r.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={
                        r.type === "in"
                          ? "text-(--success) border-(--success)/30"
                          : "text-(--danger) border-(--danger)/30"
                      }
                    >
                      {r.type === "in" ? (
                        <ArrowDown className="mr-1 h-3 w-3" />
                      ) : (
                        <ArrowUp className="mr-1 h-3 w-3" />
                      )}
                      {r.type === "in" ? "进货" : "扣减"}
                    </Badge>
                    <span className="text-[13px] tabular-nums">{r.grams}g</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
