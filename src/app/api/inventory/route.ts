import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const records = await prisma.stockRecord.findMany({
    include: { herb: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(records);
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { herbId, grams, unitPrice } = data;

    if (!herbId || !grams) {
      return NextResponse.json({ error: "缺少药材或克数" }, { status: 400 });
    }

    const record = await prisma.$transaction(async (tx) => {
      // Create stock record
      const created = await tx.stockRecord.create({
        data: {
          herbId,
          type: "in",
          grams,
          unitPrice: unitPrice ?? null,
        },
      });

      // Update herb stock and cost price
      const updateData: { stock: { increment: number }; costPrice?: number } = {
        stock: { increment: grams },
      };
      if (unitPrice) {
        updateData.costPrice = unitPrice;
      }
      await tx.herb.update({
        where: { id: herbId },
        data: updateData,
      });

      return created;
    });

    return NextResponse.json(record, { status: 201 });
  } catch {
    return NextResponse.json({ error: "进货失败" }, { status: 500 });
  }
}
