import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/services/errors";
import { updateHerb, deleteHerb } from "@/services/herbs";
import { parseId } from "@/lib/validate";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = parseId(id);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: "无效的药材ID" }, { status: 400 });
    }

    const data = await request.json();
    const { name, sellPrice, costPrice, stock, unit, unitGrams } = data;

    const herb = await updateHerb(numericId, {
      ...(name !== undefined && { name }),
      ...(sellPrice !== undefined && { sellPrice }),
      ...(costPrice !== undefined && { costPrice }),
      ...(stock !== undefined && { stock: parseFloat(stock) }),
      ...(unit !== undefined && { unit: unit || null }),
      ...(unitGrams !== undefined && { unitGrams: unitGrams != null ? parseFloat(unitGrams) : null }),
    });

    return NextResponse.json(herb);
  } catch (err) {
    return handleApiError(err, "更新药材失败");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = parseId(id);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: "无效的药材ID" }, { status: 400 });
    }

    await deleteHerb(numericId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err, "删除失败，该药材可能已被使用");
  }
}
