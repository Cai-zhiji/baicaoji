import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const { name, items } = data;

    if (!name || !items || items.length === 0) {
      return NextResponse.json(
        { error: "模版名称和药材列表不能为空" },
        { status: 400 }
      );
    }

    const template = await prisma.template.update({
      where: { id: parseInt(id) },
      data: {
        name,
        items: {
          deleteMany: {},
          create: items.map((item: { herbId: number; grams?: number }) => ({
            herbId: item.herbId,
            grams: item.grams ?? 0,
          })),
        },
      },
      include: {
        items: {
          include: { herb: { select: { id: true, name: true } } },
        },
      },
    });

    const result = {
      id: template.id,
      name: template.name,
      items: template.items.map((ti) => ({
        herbId: ti.herbId,
        herbName: ti.herb.name,
        grams: ti.grams,
      })),
    };

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "更新模版失败" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.template.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "删除模版失败" }, { status: 500 });
  }
}
