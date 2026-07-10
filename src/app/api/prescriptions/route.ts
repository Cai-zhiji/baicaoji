import { NextRequest, NextResponse } from "next/server";
import {
  createPrescription,
  deleteAllPrescriptions,
  getAllPrescriptions,
} from "@/services/prescriptions";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { patientId, items } = data;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "缺少药方明细" }, { status: 400 });
    }

    const prescription = await createPrescription(patientId, items);
    return NextResponse.json(prescription, { status: 201 });
  } catch {
    return NextResponse.json({ error: "保存药方失败" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const count = await deleteAllPrescriptions();
    return NextResponse.json({
      success: true,
      deleted: count,
      message: `已清空全部 ${count} 条药方（药材库存已退回）`,
    });
  } catch {
    return NextResponse.json({ error: "清空药方失败" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const patientId = request.nextUrl.searchParams.get("patientId");
    const take = parseInt(request.nextUrl.searchParams.get("take") || "50");

    const prescriptions = await getAllPrescriptions(
      patientId ? parseInt(patientId) : undefined,
      take,
    );

    return NextResponse.json(prescriptions);
  } catch {
    return NextResponse.json({ error: "加载药方列表失败" }, { status: 500 });
  }
}
