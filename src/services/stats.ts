import { prisma } from "@/lib/prisma";

/** 精确到分 */
export function roundToCent(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function getStats(period: "all" | "monthly" | "quarterly") {
  const now = new Date();
  let dateFrom: Date | undefined;

  if (period === "monthly") {
    dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === "quarterly") {
    const quarterStart = Math.floor(now.getMonth() / 3) * 3;
    dateFrom = new Date(now.getFullYear(), quarterStart, 1);
  }

  const where = dateFrom ? { createdAt: { gte: dateFrom } } : {};

  const prescriptions = await prisma.prescription.findMany({
    where,
    include: {
      items: {
        include: { herb: { select: { name: true } } },
      },
    },
  });

  const totalRevenue = prescriptions.reduce((sum, p) => sum + p.totalPrice, 0);
  const totalCost = prescriptions.reduce((sum, p) => sum + p.totalCost, 0);
  const totalProfit = totalRevenue - totalCost;

  // Per-herb breakdown
  const herbMap = new Map<string, { revenue: number; cost: number }>();
  for (const p of prescriptions) {
    for (const item of p.items) {
      const name = item.herb.name;
      const existing = herbMap.get(name) ?? { revenue: 0, cost: 0 };
      herbMap.set(name, {
        revenue: existing.revenue + item.unitPrice * item.grams,
        cost: existing.cost + item.unitCost * item.grams,
      });
    }
  }

  const herbBreakdown = Array.from(herbMap.entries())
    .map(([name, { revenue, cost }]) => ({
      name,
      revenue: roundToCent(revenue),
      cost: roundToCent(cost),
      profit: roundToCent(revenue - cost),
      prescriptionCount: prescriptions.filter((p) =>
        p.items.some((i) => i.herb.name === name),
      ).length,
    }))
    .sort((a, b) => b.profit - a.profit);

  return {
    totalRevenue: roundToCent(totalRevenue),
    totalCost: roundToCent(totalCost),
    totalProfit: roundToCent(totalProfit),
    prescriptionCount: prescriptions.length,
    herbBreakdown,
  };
}
