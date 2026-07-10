import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/services/errors";
import { listHerbs, createHerb } from "@/services/herbs";

export async function DELETE() {
  try {
    // 按依赖顺序删除：库存记录 → 药材（PrescriptionItem/TemplateItem 有 onDelete: SetNull，保留名称）
    const count = await prisma.$transaction(async (tx) => {
      await tx.stockRecord.deleteMany();
      const r = await tx.herb.deleteMany();
      return r.count;
    });
    return NextResponse.json({
      success: true,
      deleted: count,
      message: `已清空全部 ${count} 种药材（药方和模版中的药材名称已保留）`,
    });
  } catch (err) {
    return handleApiError(err, "清空药材失败");
  }
}

export async function GET() {
  try {
    const herbs = await listHerbs();
    return NextResponse.json(herbs);
  } catch {
    return NextResponse.json({ error: "加载药材列表失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { name, sellPrice, costPrice, stock, unit, unitGrams } = data;

    if (!name) {
      return NextResponse.json({ error: "药材名称不能为空" }, { status: 400 });
    }

    const sell = sellPrice ?? 0;
    const cost = costPrice ?? 0;
    if (sell < 0 || cost < 0) {
      return NextResponse.json({ error: "价格不能为负数" }, { status: 400 });
    }

    const existing = await prisma.herb.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: "药材已存在" }, { status: 409 });
    }

    const herb = await createHerb({
      name,
      sellPrice: sell,
      costPrice: cost,
      stock: stock != null ? parseFloat(stock) : undefined,
      unit: unit ?? null,
      unitGrams: unitGrams != null ? parseFloat(unitGrams) : null,
    });

    return NextResponse.json(herb, { status: 201 });
  } catch (err) {
    return handleApiError(err, "创建药材失败");
  }
}
