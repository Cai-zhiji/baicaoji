import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const prescriptionId = request.nextUrl.searchParams.get("prescriptionId");

  const followUps = await prisma.followUp.findMany({
    where: prescriptionId ? { prescriptionId: parseInt(prescriptionId) } : undefined,
    include: {
      prescription: {
        select: { patient: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(followUps);
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { prescriptionId, evaluation, note } = data;

    if (!prescriptionId || !evaluation) {
      return NextResponse.json(
        { error: "缺少药方或评价" },
        { status: 400 }
      );
    }

    const VALID_EVALUATIONS = ["痊愈", "显效", "有效", "无效", "加重"];
    if (!VALID_EVALUATIONS.includes(evaluation)) {
      return NextResponse.json(
        { error: "无效的评价类型" },
        { status: 400 }
      );
    }

    const followUp = await prisma.followUp.create({
      data: {
        prescriptionId,
        evaluation,
        note: note || null,
      },
      include: {
        prescription: {
          select: { patient: { select: { name: true } } },
        },
      },
    });

    return NextResponse.json(followUp, { status: 201 });
  } catch {
    return NextResponse.json({ error: "保存随访记录失败" }, { status: 500 });
  }
}
