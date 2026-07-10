import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const templates = await prisma.template.findMany({
    include: {
      items: {
        include: { herb: { select: { id: true, name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = templates.map((t) => ({
    id: t.id,
    name: t.name,
    items: t.items.map((ti) => ({
      herbId: ti.herbId,
      herbName: ti.herb.name,
      grams: ti.grams,
    })),
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { name, herbIds, items } = data;

    // 支持两种格式：旧格式 { name, herbIds: number[] } 和新格式 { name, items: { herbId, grams }[] }
    const templateItems =
      items ??
      (herbIds as number[])?.map((herbId: number) => ({ herbId, grams: 0 }));

    if (!name || !templateItems || templateItems.length === 0) {
      return NextResponse.json(
        { error: "模版名称和药材列表不能为空" },
        { status: 400 }
      );
    }

    const template = await prisma.template.create({
      data: {
        name,
        items: {
          create: templateItems.map(
            (item: { herbId: number; grams?: number }) => ({
              herbId: item.herbId,
              grams: item.grams ?? 0,
            })
          ),
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

    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建模版失败" }, { status: 500 });
  }
}
