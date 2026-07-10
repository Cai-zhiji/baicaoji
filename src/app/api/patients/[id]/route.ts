import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const patient = await prisma.patient.findUnique({
      where: { id: parseInt(id) },
      include: {
        prescriptions: {
          include: {
            items: {
              include: { herb: { select: { name: true } } },
            },
            followUps: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

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
    const { id } = await params;
    const data = await request.json();
    const { name, gender, age, phone } = data;

    const patient = await prisma.patient.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(gender && { gender }),
        ...(age !== undefined && { age }),
        ...(phone !== undefined && { phone }),
      },
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
    const { id } = await params;
    await prisma.patient.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "删除失败，该病人可能有关联药方" }, { status: 500 });
  }
}
