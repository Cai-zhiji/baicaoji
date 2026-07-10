import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  try {
    const result = await prisma.patient.deleteMany();
    return NextResponse.json({
      success: true,
      deleted: result.count,
      message: `已清空全部 ${result.count} 位病人`,
    });
  } catch {
    return NextResponse.json({ error: "清空病人失败" }, { status: 500 });
  }
}

export async function GET() {
  const patients = await prisma.patient.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(patients);
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { name, gender, age, phone } = data;

    if (!name) {
      return NextResponse.json({ error: "病人姓名不能为空" }, { status: 400 });
    }

    // Check if patient with same name exists (auto-merge)
    const existing = await prisma.patient.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json(
        { error: `病人"${name}"已存在，请使用已有档案`, existingPatient: existing },
        { status: 409 }
      );
    }

    const patient = await prisma.patient.create({
      data: { name, gender: gender ?? "男", age: age ?? null, phone: phone ?? null },
    });

    return NextResponse.json(patient, { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建病人失败" }, { status: 500 });
  }
}
