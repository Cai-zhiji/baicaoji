import { NextRequest, NextResponse } from "next/server";
import {
  listPatients,
  createPatient,
  deleteAllPatients,
} from "@/services/patients";

export async function DELETE() {
  try {
    const count = await deleteAllPatients();
    return NextResponse.json({
      success: true,
      deleted: count,
      message: `已清空全部 ${count} 位病人`,
    });
  } catch {
    return NextResponse.json({ error: "清空病人失败" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const patients = await listPatients();
    return NextResponse.json(patients);
  } catch {
    return NextResponse.json({ error: "加载病人列表失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { name, gender, age, phone } = data;

    if (!name) {
      return NextResponse.json({ error: "病人姓名不能为空" }, { status: 400 });
    }

    const result = await createPatient({
      name,
      gender: gender ?? "男",
      age: age ?? null,
      phone: phone ?? null,
    });

    // Check if patient with same name exists (auto-merge)
    if ("existingPatient" in result) {
      return NextResponse.json(
        {
          error: `病人"${name}"已存在，请使用已有档案`,
          existingPatient: result.existingPatient,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建病人失败" }, { status: 500 });
  }
}
