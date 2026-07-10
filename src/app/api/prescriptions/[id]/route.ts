import { NextRequest, NextResponse } from "next/server";
import {
  getPrescriptionById,
  deletePrescription,
} from "@/services/prescriptions";
import { parseId } from "@/lib/validate";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const numericId = parseId(id);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: "无效的药方ID" }, { status: 400 });
    }

    const prescription = await getPrescriptionById(numericId);

    if (!prescription) {
      return NextResponse.json({ error: "药方不存在" }, { status: 404 });
    }

    return NextResponse.json(prescription);
  } catch {
    return NextResponse.json({ error: "加载药方失败" }, { status: 500 });
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
      return NextResponse.json({ error: "无效的药方ID" }, { status: 400 });
    }

    await deletePrescription(numericId);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "药方不存在" }, { status: 404 });
    }
    return NextResponse.json({ error: "删除药方失败" }, { status: 500 });
  }
}
