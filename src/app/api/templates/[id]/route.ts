import { NextRequest, NextResponse } from "next/server";
import {
  updateTemplate,
  deleteTemplate,
  markTemplateUsed,
} from "@/services/templates";

/** 标记模版被使用（更新 lastUsedAt） */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await markTemplateUsed(parseInt(id));
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
    const data = await request.json();
    const { name, items } = data;

    if (!name || !items || items.length === 0) {
      return NextResponse.json(
        { error: "模版名称和药材列表不能为空" },
        { status: 400 },
      );
    }

    const template = await updateTemplate(parseInt(id), name, items);
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
    await deleteTemplate(parseInt(id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "删除模版失败" }, { status: 500 });
  }
}
