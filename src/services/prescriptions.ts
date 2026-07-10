import { prisma } from "@/lib/prisma";
import { deductStock, restoreStock } from "@/services/stock";

/* ── 查询 ── */

const prescriptionInclude = {
  patient: { select: { name: true } as const },
  items: {
    include: { herb: { select: { name: true } as const } },
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
      herb: { id: i.herb.id, name: i.herb.name },
      grams: i.grams,
      unitPrice: i.unitPrice,
      unitCost: i.unitCost,
    })),
  };
}

/* ── 创建 ── */

interface CreateItemInput {
  herbId: number;
  grams: number;
  unitPrice: number;
}

export async function createPrescription(
  patientId: number,
  items: CreateItemInput[],
) {
  return prisma.$transaction(async (tx) => {
    // 加载成本价
    const herbIds = items.map((i) => i.herbId);
    const herbs = await tx.herb.findMany({
      where: { id: { in: herbIds } },
      select: { id: true, costPrice: true },
    });
    const costMap = new Map(herbs.map((h) => [h.id, h.costPrice]));

    // 计算总成本并准备快照数据
    let totalCost = 0;
    const itemsWithCost = items.map((item) => {
      const unitCost = costMap.get(item.herbId) ?? 0;
      totalCost += unitCost * item.grams;
      return {
        herbId: item.herbId,
        grams: item.grams,
        unitPrice: item.unitPrice,
        unitCost,
      };
    });

    const totalPrice = items.reduce(
      (sum, item) => sum + item.unitPrice * item.grams,
      0,
    );

    // 创建药方
    const created = await tx.prescription.create({
      data: {
        patientId,
        totalPrice: Math.round(totalPrice * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        items: { create: itemsWithCost },
      },
      include: {
        items: true,
        patient: true,
      },
    });

    // 扣减库存
    for (const item of items) {
      await deductStock(item.herbId, item.grams, item.unitPrice, tx);
    }

    return created;
  });
}

/* ── 删除 ── */

export async function deletePrescription(id: number) {
  const prescription = await prisma.prescription.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!prescription) {
    throw new Error("NOT_FOUND");
  }

  // 退回库存
  for (const item of prescription.items) {
    await restoreStock(item.herbId, item.grams, item.unitPrice);
  }

  // 删除药方（级联删除 items 和 followUps）
  await prisma.prescription.delete({ where: { id } });
}

export async function deleteAllPrescriptions() {
  const count = await prisma.$transaction(async (tx) => {
    // 退回所有库存
    const items = await tx.prescriptionItem.findMany();
    for (const item of items) {
      await restoreStock(item.herbId, item.grams, item.unitPrice, tx);
    }

    // 级联删除
    await tx.followUp.deleteMany();
    await tx.prescriptionItem.deleteMany();
    const r = await tx.prescription.deleteMany();
    return r.count;
  });

  return count;
}
