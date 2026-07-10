import { NextRequest, NextResponse } from "next/server";
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
    const { name, herbIds, items } = data;

    // 支持两种格式：旧格式 { name, herbIds: number[] } 和新格式 { name, items: { herbId, grams }[] }
    const templateItems =
      items ??
      (herbIds as number[])?.map((herbId: number) => ({ herbId, grams: 0 }));

    if (!name || !templateItems || templateItems.length === 0) {
      return NextResponse.json(
        { error: "模版名称和药材列表不能为空" },
        { status: 400 },
      );
    }

    const template = await createTemplate(name, templateItems);
    return NextResponse.json(template, { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建模版失败" }, { status: 500 });
  }
}
