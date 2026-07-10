import { prisma } from "@/lib/prisma";

/**
 * Prisma 客户端或其事务客户端。
 * 事务客户端去掉了 $connect/$disconnect 等顶层方法，
 * 但保留了所有模型方法（herb、stockRecord 等）。
 * 使用 Omit 类型使两者兼容。
 */
type PrismaTx = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$use" | "$extends" | "$transaction"
>;

/**
 * 扣减药材库存（开方时调用）。
 * 在事务内执行：stock decrement + StockRecord(type:"out")。
 */
export async function deductStock(
  herbId: number,
  grams: number,
  unitPrice: number,
  tx: PrismaTx = prisma,
) {
  await tx.herb.update({
    where: { id: herbId },
    data: { stock: { decrement: grams } },
  });
  await tx.stockRecord.create({
    data: {
      herbId,
      type: "out",
      grams,
      unitPrice,
    },
  });
}

/**
 * 退回药材库存（删除药方时调用）。
 * 在事务内执行：stock increment + StockRecord(type:"in")。
 */
export async function restoreStock(
  herbId: number,
  grams: number,
  unitPrice: number,
  tx: PrismaTx = prisma,
) {
  await tx.herb.update({
    where: { id: herbId },
    data: { stock: { increment: grams } },
  });
  await tx.stockRecord.create({
    data: {
      herbId,
      type: "in",
      grams,
      unitPrice,
    },
  });
}

/**
 * 进货增加库存。
 * 在事务内执行：stock increment + 可选更新 costPrice + StockRecord(type:"in")。
 */
export async function addStock(
  herbId: number,
  grams: number,
  unitPrice: number | null,
  tx: PrismaTx = prisma,
) {
  const updateData: {
    stock: { increment: number };
    costPrice?: number;
  } = { stock: { increment: grams } };
  if (unitPrice != null) {
    updateData.costPrice = unitPrice;
  }
  await tx.herb.update({ where: { id: herbId }, data: updateData });
  return tx.stockRecord.create({
    data: { herbId, type: "in", grams, unitPrice },
  });
}
