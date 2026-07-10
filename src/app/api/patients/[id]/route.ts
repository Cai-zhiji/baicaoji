import { NextRequest, NextResponse } from "next/server";
import {
  getPatientById,
  updatePatient,
  deletePatient,
} from "@/services/patients";
import { parseId } from "@/lib/validate";

function getNumericId(params: Promise<{ id: string }>): Promise<number> {
  return params.then(({ id }) => parseId(id));
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const numericId = await getNumericId(params);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: "无效的病人ID" }, { status: 400 });
    }

    const patient = await getPatientById(numericId);

    if (!patient) {
      return NextResponse.json({ error: "病人不存在" }, { status: 404 });
    }

    return NextResponse.json(patient);
  } catch {
    return NextResponse.json({ error: "获取病人信息失败" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const numericId = await getNumericId(params);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: "无效的病人ID" }, { status: 400 });
    }

    const data = await request.json();
    const { name, gender, age, phone } = data;

    const patient = await updatePatient(numericId, {
      ...(name !== undefined && { name }),
      ...(gender !== undefined && { gender }),
      ...(age !== undefined && { age }),
      ...(phone !== undefined && { phone }),
    });

    return NextResponse.json(patient);
  } catch {
    return NextResponse.json({ error: "更新病人失败" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const numericId = await getNumericId(params);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: "无效的病人ID" }, { status: 400 });
    }

    await deletePatient(numericId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "删除失败，该病人可能有关联药方" }, { status: 500 });
  }
}
