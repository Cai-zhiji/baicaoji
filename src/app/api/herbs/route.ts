import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/services/errors";
import { listHerbs, createHerb } from "@/services/herbs";

export async function DELETE() {
  try {
    // 按依赖顺序删除：处方明细 → 模版明细 → 药材 → 库存记录
    const count = await prisma.$transaction(async (tx) => {
      await tx.prescriptionItem.deleteMany();
      await tx.templateItem.deleteMany();
      await tx.stockRecord.deleteMany();
      const r = await tx.herb.deleteMany();
      return r.count;
    });
    return NextResponse.json({
      success: true,
      deleted: count,
      message: `已清空全部 ${count} 种药材（同时清空了相关药方明细和模版明细）`,
    });
  } catch (err) {
    return handleApiError(err, "清空药材失败");
  }
}

export async function GET() {
  const herbs = await listHerbs();
  return NextResponse.json(herbs);
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { name, sellPrice, costPrice, stock, unit, unitGrams } = data;

    if (!name) {
      return NextResponse.json({ error: "药材名称不能为空" }, { status: 400 });
    }

    const existing = await prisma.herb.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: "药材已存在" }, { status: 409 });
    }

    const herb = await createHerb({
      name,
      sellPrice: sellPrice ?? 0,
      costPrice: costPrice ?? 0,
      stock: stock != null ? parseFloat(stock) : undefined,
      unit: unit ?? null,
      unitGrams: unitGrams != null ? parseFloat(unitGrams) : null,
    });

    return NextResponse.json(herb, { status: 201 });
  } catch (err) {
    return handleApiError(err, "创建药材失败");
  }
}
