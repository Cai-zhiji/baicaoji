import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  listTemplates,
  createTemplate,
  deleteAllTemplates,
} from "@/services/templates";

export async function DELETE() {
  try {
    const count = await deleteAllTemplates();
    return NextResponse.json({
      success: true,
      deleted: count,
      message: `已清空全部 ${count} 个模版`,
    });
  } catch {
    return NextResponse.json({ error: "清空模版失败" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const templates = await listTemplates();
    return NextResponse.json(templates);
  } catch {
    return NextResponse.json({ error: "加载模版列表失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { name, herbIds: legacyHerbIds, items } = data;

    // 支持旧格式 { name, herbIds: number[] } 和新格式 { name, items: { herbId, herbName?, grams }[] }
    const rawItems: { herbId?: number | null; herbName?: string; grams?: number }[] =
      items ??
      (Array.isArray(legacyHerbIds)
        ? legacyHerbIds.map((herbId: number) => ({ herbId, grams: 0 }))
        : []);

    if (!name || rawItems.length === 0) {
      return NextResponse.json(
        { error: "模版名称和药材列表不能为空" },
        { status: 400 },
      );
    }

    // 解析 herbName：优先用请求中的 herbName，否则从数据库查
    const ids = rawItems.map((i) => i.herbId).filter((id): id is number => id != null && id > 0);
    const herbs = ids.length > 0
      ? await prisma.herb.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true },
        })
      : [];
    const nameMap = new Map(herbs.map((h) => [h.id, h.name]));

    const templateItems = rawItems.map((item) => ({
      herbId: item.herbId ?? null,
      herbName: item.herbName ?? (item.herbId ? nameMap.get(item.herbId) : undefined) ?? `未知药材`,
      grams: item.grams ?? 0,
    }));

    const template = await createTemplate(name, templateItems);
    return NextResponse.json(template, { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建模版失败" }, { status: 500 });
  }
}
