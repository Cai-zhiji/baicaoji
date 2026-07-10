import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const period = request.nextUrl.searchParams.get("period") || "all";

  // Calculate date filter
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

  // Per-herb profit breakdown using exact unitCost snapshots
  const herbMap = new Map<string, { revenue: number; cost: number }>();
  for (const p of prescriptions) {
    for (const item of p.items) {
      const name = item.herb.name;
      const existing = herbMap.get(name) || { revenue: 0, cost: 0 };
      herbMap.set(name, {
        revenue: existing.revenue + item.unitPrice * item.grams,
        cost: existing.cost + item.unitCost * item.grams,
      });
    }
  }

  const herbBreakdown = Array.from(herbMap.entries())
    .map(([name, { revenue, cost }]) => ({
      name,
      revenue: Math.round(revenue * 100) / 100,
      cost: Math.round(cost * 100) / 100,
      profit: Math.round((revenue - cost) * 100) / 100,
      prescriptionCount: prescriptions.filter((p) =>
        p.items.some((i) => i.herb.name === name)
      ).length,
    }))
    .sort((a, b) => b.profit - a.profit);

  return NextResponse.json({
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    totalProfit: Math.round(totalProfit * 100) / 100,
    prescriptionCount: prescriptions.length,
    herbBreakdown,
  });
}
