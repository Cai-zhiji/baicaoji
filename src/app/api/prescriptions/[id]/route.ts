import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const prescriptionId = parseInt(id);

    // Get all items to restore stock
    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: { items: true },
    });

    if (!prescription) {
      return NextResponse.json({ error: "药方不存在" }, { status: 404 });
    }

    // Restore stock and record return
    for (const item of prescription.items) {
      await prisma.herb.update({
        where: { id: item.herbId },
        data: { stock: { increment: item.grams } },
      });
      await prisma.stockRecord.create({
        data: {
          herbId: item.herbId,
          type: "in",
          grams: item.grams,
          unitPrice: item.unitPrice,
        },
      });
    }

    // Delete prescription (cascades to items and followUps)
    await prisma.prescription.delete({ where: { id: prescriptionId } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "删除药方失败" }, { status: 500 });
  }
}
