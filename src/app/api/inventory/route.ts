import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addStock } from "@/services/stock";

export async function GET() {
  try {
    const records = await prisma.stockRecord.findMany({
      include: { herb: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(records);
  } catch {
    return NextResponse.json({ error: "加载库存记录失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { herbId, grams, unitPrice } = data;

    if (!herbId || !grams) {
      return NextResponse.json({ error: "缺少药材或克数" }, { status: 400 });
    }

    const record = await addStock(herbId, grams, unitPrice ?? null);
    return NextResponse.json(record, { status: 201 });
  } catch {
    return NextResponse.json({ error: "进货失败" }, { status: 500 });
  }
}
