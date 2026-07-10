import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  updateTemplate,
  deleteTemplate,
  markTemplateUsed,
} from "@/services/templates";
import { parseId } from "@/lib/validate";

/** 标记模版被使用（更新 lastUsedAt） */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const numericId = parseId(id);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: "无效的模版ID" }, { status: 400 });
    }

    await markTemplateUsed(numericId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const numericId = parseId(id);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: "无效的模版ID" }, { status: 400 });
    }

    const data = await request.json();
    const { name, items } = data;

    if (!name || !items || items.length === 0) {
      return NextResponse.json(
        { error: "模版名称和药材列表不能为空" },
        { status: 400 },
      );
    }

    // 解析 herbName：优先用请求中的 herbName，否则从数据库查
    const safeItems: { herbId?: number | null; herbName?: string; grams?: number }[] = items;
    const herbIds = safeItems.map((i) => i.herbId).filter((id): id is number => id != null && id > 0);
    const herbs = herbIds.length > 0
      ? await prisma.herb.findMany({
          where: { id: { in: herbIds } },
          select: { id: true, name: true },
        })
      : [];
    const nameMap = new Map(herbs.map((h) => [h.id, h.name]));

    const templateItems = safeItems.map((item) => ({
      herbId: item.herbId ?? null,
      herbName: item.herbName ?? (item.herbId ? nameMap.get(item.herbId) : undefined) ?? `未知药材`,
      grams: item.grams ?? 0,
    }));

    const template = await updateTemplate(numericId, name, templateItems);
    return NextResponse.json(template);
  } catch {
    return NextResponse.json({ error: "更新模版失败" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const numericId = parseId(id);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: "无效的模版ID" }, { status: 400 });
    }

    await deleteTemplate(numericId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "删除模版失败" }, { status: 500 });
  }
}
