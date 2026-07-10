import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/services/errors";
import { listHerbs, createHerb } from "@/services/herbs";

export async function GET() {
  const herbs = await listHerbs();
  return NextResponse.json(herbs);
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { name, sellPrice, costPrice, stock } = data;

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
    });

    return NextResponse.json(herb, { status: 201 });
  } catch (err) {
    return handleApiError(err, "创建药材失败");
  }
}
