import { prisma } from "@/lib/prisma";
import { deductStock, restoreStock } from "@/services/stock";

/* ── 查询 ── */

const prescriptionInclude = {
  patient: { select: { name: true } as const },
  items: {
    select: {
      id: true,
      prescriptionId: true,
      herbId: true,
      herbName: true,
      grams: true,
      unitPrice: true,
      unitCost: true,
      herb: { select: { name: true } },
    },
  },
};

export async function getAllPrescriptions(patientId?: number, take = 50) {
  return prisma.prescription.findMany({
    where: patientId ? { patientId } : undefined,
    include: prescriptionInclude,
    orderBy: { createdAt: "desc" as const },
    take,
  });
}

export async function getPrescriptionById(id: number) {
  const prescription = await prisma.prescription.findUnique({
    where: { id },
    include: {
      patient: { select: { id: true, name: true } as const },
      items: {
        include: { herb: { select: { id: true, name: true } as const } },
      },
    },
  });

  if (!prescription) return null;

  // 格式化为前端友好的 DTO
  return {
    id: prescription.id,
    patientId: prescription.patientId,
    patient: prescription.patient,
    totalPrice: prescription.totalPrice,
    totalCost: prescription.totalCost,
    createdAt: prescription.createdAt,
    items: prescription.items.map((i) => ({
      herbId: i.herbId,
      herbName: i.herbName,
      herb: i.herb ? { id: i.herb.id, name: i.herb.name } : { id: null, name: i.herbName },
      grams: i.grams,
      unitPrice: i.unitPrice,
      unitCost: i.unitCost,
    })),
  };
}

/* ── 创建 ── */

interface CreateItemInput {
  herbId: number | null;
  herbName: string;
  grams: number;
  unitPrice: number;
}

export async function createPrescription(
  patientId: number | null,
  items: CreateItemInput[],
) {
  return prisma.$transaction(async (tx) => {
    // 分离已知/未知药材
    const knownIds = items
      .map((i) => i.herbId)
      .filter((id): id is number => id !== null && id > 0);

    // 加载已知药材的成本价
    const herbs = knownIds.length > 0
      ? await tx.herb.findMany({
          where: { id: { in: knownIds } },
          select: { id: true, costPrice: true },
        })
      : [];
    const costMap = new Map(herbs.map((h) => [h.id, h.costPrice]));

    // 计算总价/总成本，准备快照数据
    let totalPrice = 0;
    let totalCost = 0;
    const itemsData = items.map((item) => {
      const unitCost = item.herbId ? (costMap.get(item.herbId) ?? 0) : 0;
      const itemTotal = item.unitPrice * item.grams;
      totalPrice += itemTotal;
      totalCost += unitCost * item.grams;
      return {
        herbId: item.herbId,
        herbName: item.herbName,
        grams: item.grams,
        unitPrice: item.unitPrice,
        unitCost,
      };
    });

    // 创建药方
    const created = await tx.prescription.create({
      data: {
        patientId,
        totalPrice: Math.round(totalPrice * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        items: { create: itemsData },
      },
      include: {
        items: true,
        patient: true,
      },
    });

    // 仅对已知药材扣减库存
    for (const item of items) {
      if (item.herbId) {
        await deductStock(item.herbId, item.grams, item.unitPrice, tx);
      }
    }

    return created;
  });
}

/* ── 删除 ── */

export async function deletePrescription(id: number) {
  return prisma.$transaction(async (tx) => {
    const prescription = await tx.prescription.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!prescription) {
      throw new Error("NOT_FOUND");
    }

    // 退回库存（仅已知药材）
    for (const item of prescription.items) {
      if (item.herbId) {
        await restoreStock(item.herbId, item.grams, item.unitPrice, tx);
      }
    }

    // 删除药方（级联删除 items 和 followUps）
    await tx.prescription.delete({ where: { id } });
  });
}

export async function deleteAllPrescriptions() {
  const count = await prisma.$transaction(async (tx) => {
    // 退回所有库存（仅已知药材）
    const items = await tx.prescriptionItem.findMany();
    for (const item of items) {
      if (item.herbId) {
        await restoreStock(item.herbId, item.grams, item.unitPrice, tx);
      }
    }

    // 级联删除（PrescriptionItem 和 FollowUp 有 onDelete: Cascade）
    const r = await tx.prescription.deleteMany();
    return r.count;
  });

  return count;
}
