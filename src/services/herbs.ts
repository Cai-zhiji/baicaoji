import { prisma } from "@/lib/prisma";
import { toPinyin } from "@/lib/pinyin";
import { addStock, deductStock } from "@/services/stock";

export interface CreateHerbInput {
  name: string;
  sellPrice: number;
  costPrice: number;
  stock?: number;
  unit?: string | null;
  unitGrams?: number | null;
}

export interface UpdateHerbInput {
  name?: string;
  sellPrice?: number;
  costPrice?: number;
  stock?: number;
  unit?: string | null;
  unitGrams?: number | null;
}

export async function listHerbs() {
  return prisma.herb.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getHerbById(id: number) {
  return prisma.herb.findUnique({ where: { id } });
}

export async function createHerb(input: CreateHerbInput) {
  const stock = input.stock ?? 0;

  return prisma.$transaction(async (tx) => {
    const herb = await tx.herb.create({
      data: {
        name: input.name,
        pinyin: toPinyin(input.name),
        sellPrice: input.sellPrice,
        costPrice: input.costPrice,
        stock,
        unit: input.unit ?? null,
        unitGrams: input.unitGrams ?? null,
      },
    });

    // 初始库存记录（通过 stock 模块统一入口）
    if (stock > 0) {
      await addStock(herb.id, stock, input.costPrice || null, tx);
    }

    return herb;
  });
}

export async function updateHerb(id: number, input: UpdateHerbInput) {
  return prisma.$transaction(async (tx) => {
    // 库存变动
    if (input.stock !== undefined) {
      const current = await tx.herb.findUnique({ where: { id } });
      if (current) {
        const delta = input.stock - current.stock;
        if (delta > 0) {
          await addStock(id, delta, input.costPrice ?? null, tx);
        } else if (delta < 0) {
          await deductStock(id, Math.abs(delta), current.sellPrice, tx);
        }
      }
    }

    return tx.herb.update({
      where: { id },
      data: {
        ...(input.name !== undefined && {
          name: input.name,
          pinyin: toPinyin(input.name),
        }),
        ...(input.sellPrice !== undefined && { sellPrice: input.sellPrice }),
        ...(input.costPrice !== undefined && { costPrice: input.costPrice }),
        ...(input.stock !== undefined && { stock: input.stock }),
        ...(input.unit !== undefined && { unit: input.unit }),
        ...(input.unitGrams !== undefined && { unitGrams: input.unitGrams }),
      },
    });
  });
}

export async function deleteHerb(id: number) {
  return prisma.$transaction(async (tx) => {
    // 先删除关联的库存记录（虽然 onDelete: Cascade，但显式处理更安全）
    await tx.stockRecord.deleteMany({ where: { herbId: id } });
    return tx.herb.delete({ where: { id } });
  });
}

export async function upsertHerbByName(
  name: string,
  sellPrice: number,
  costPrice: number
) {
  return prisma.herb.upsert({
    where: { name },
    update: { sellPrice, costPrice },
    create: {
      name,
      pinyin: toPinyin(name),
      sellPrice,
      costPrice,
    },
  });
}

export async function getAllHerbMap() {
  const all = await prisma.herb.findMany({
    select: { id: true, name: true },
  });
  return new Map(all.map((h) => [h.name, h.id]));
}
