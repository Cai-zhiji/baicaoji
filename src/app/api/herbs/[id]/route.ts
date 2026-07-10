import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/services/errors";
import { updateHerb, deleteHerb } from "@/services/herbs";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const { name, sellPrice, costPrice, stock, unit, unitGrams } = data;

    const herb = await updateHerb(parseInt(id), {
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
    await deleteHerb(parseInt(id));
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err, "删除失败，该药材可能已被使用");
  }
}
