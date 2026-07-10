import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [herbs, patients, prescriptions, templates, followUps, stockRecords] =
    await Promise.all([
      prisma.herb.findMany(),
      prisma.patient.findMany(),
      prisma.prescription.findMany({
        include: {
          patient: { select: { name: true } },
          items: {
            include: { herb: { select: { name: true } } },
          },
          followUps: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.template.findMany({
        include: {
          items: {
            include: { herb: { select: { name: true } } },
          },
        },
      }),
      prisma.followUp.findMany({
        include: {
          prescription: {
            select: { patient: { select: { name: true } } },
          },
        },
      }),
      prisma.stockRecord.findMany({
        include: { herb: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    app: "百草计",
    herbs,
    patients,
    prescriptions,
    templates,
    followUps,
    stockRecords,
  };

  return NextResponse.json(exportData, {
    headers: {
      "Content-Disposition": `attachment; filename="baicaoji-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
