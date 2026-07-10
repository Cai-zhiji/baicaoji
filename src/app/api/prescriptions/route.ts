import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { patientId, items, totalPrice } = data;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "缺少药方明细" }, { status: 400 });
    }

    const prescription = await prisma.$transaction(async (tx) => {
      // Load all herbs in one query to get cost prices
      const herbIds = items.map((i: { herbId: number }) => i.herbId);
      const herbs = await tx.herb.findMany({
        where: { id: { in: herbIds } },
        select: { id: true, costPrice: true },
      });
      const costMap = new Map(herbs.map((h) => [h.id, h.costPrice]));

      // Calculate total cost and prepare items with unitCost snapshots
      let totalCost = 0;
      const itemsWithCost = items.map(
        (item: { herbId: number; grams: number; unitPrice: number }) => {
          const unitCost = costMap.get(item.herbId) ?? 0;
          totalCost += unitCost * item.grams;
          return {
            herbId: item.herbId,
            grams: item.grams,
            unitPrice: item.unitPrice,
            unitCost,
          };
        }
      );

      const created = await tx.prescription.create({
        data: {
          patientId,
          totalPrice: totalPrice ?? 0,
          totalCost,
          items: { create: itemsWithCost },
        },
        include: {
          items: true,
          patient: true,
        },
      });

      // Deduct stock and record
      for (const item of items) {
        await tx.herb.update({
          where: { id: item.herbId },
          data: { stock: { decrement: item.grams } },
        });
        await tx.stockRecord.create({
          data: {
            herbId: item.herbId,
            type: "out",
            grams: item.grams,
            unitPrice: item.unitPrice,
          },
        });
      }

      return created;
    });

    return NextResponse.json(prescription, { status: 201 });
  } catch {
    return NextResponse.json({ error: "保存药方失败" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const count = await prisma.$transaction(async (tx) => {
      // 获取所有处方明细以退回库存
      const items = await tx.prescriptionItem.findMany();
      for (const item of items) {
        await tx.herb.update({
          where: { id: item.herbId },
          data: { stock: { increment: item.grams } },
        });
        await tx.stockRecord.create({
          data: {
            herbId: item.herbId,
            type: "in",
            grams: item.grams,
            unitPrice: item.unitPrice,
          },
        });
      }
      // 删除所有随访 → 处方明细 → 处方
      await tx.followUp.deleteMany();
      await tx.prescriptionItem.deleteMany();
      const r = await tx.prescription.deleteMany();
      return r.count;
    });
    return NextResponse.json({
      success: true,
      deleted: count,
      message: `已清空全部 ${count} 条药方（药材库存已退回）`,
    });
  } catch {
    return NextResponse.json({ error: "清空药方失败" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const patientId = request.nextUrl.searchParams.get("patientId");
  const take = parseInt(request.nextUrl.searchParams.get("take") || "50");

  const prescriptions = await prisma.prescription.findMany({
    where: patientId ? { patientId: parseInt(patientId) } : undefined,
    include: {
      patient: { select: { name: true } },
      items: {
        include: { herb: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  return NextResponse.json(prescriptions);
}
