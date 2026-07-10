import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseCsvLine } from "@/lib/csv";
import { toPinyin } from "@/lib/pinyin";
import { handleApiError } from "@/services/errors";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "请上传 CSV 文件" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text
      .trim()
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      return NextResponse.json({ error: "CSV 文件为空或只有表头" }, { status: 400 });
    }

    const header = parseCsvLine(lines[0]).map((h) => h.replace(/"/g, ""));
    const nameIdx = header.findIndex((h) => h === "名称" || h.toLowerCase() === "name");
    const sellPriceIdx = header.findIndex(
      (h) => h === "售价" || h === "sellPrice" || h.toLowerCase() === "sellprice" || h === "price"
    );
    const costPriceIdx = header.findIndex(
      (h) => h === "成本价" || h === "costPrice" || h.toLowerCase() === "costprice" || h === "cost"
    );

    if (nameIdx === -1) {
      return NextResponse.json(
        { error: "CSV 缺少「名称」列，请确保表头包含：名称, 售价, 成本价" },
        { status: 400 }
      );
    }

    // Preload existing herbs
    const existingHerbs = await prisma.herb.findMany({ select: { name: true } });
    const existingNames = new Set(existingHerbs.map((h) => h.name));

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]).map((c) => c.replace(/^"|"$/g, ""));
      const name = cols[nameIdx]?.trim();
      if (!name) {
        skipped++;
        continue;
      }

      // 重复则跳过
      if (existingNames.has(name)) {
        skipped++;
        continue;
      }

      const sellPrice = sellPriceIdx !== -1 ? parseFloat(cols[sellPriceIdx]) || 0 : 0;
      const costPrice = costPriceIdx !== -1 ? parseFloat(cols[costPriceIdx]) || 0 : 0;

      try {
        await prisma.herb.create({
          data: {
            name,
            pinyin: toPinyin(name),
            sellPrice,
            costPrice,
          },
        });
        existingNames.add(name);
        created++;
      } catch {
        errors.push(`第 ${i + 1} 行「${name}」导入失败`);
      }
    }

    return NextResponse.json({
      success: true,
      created,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      message: `成功导入 ${created} 条${skipped > 0 ? `，跳过 ${skipped} 条（重复或空名称）` : ""}`,
    });
  } catch (err) {
    return handleApiError(err, "CSV 导入失败");
  }
}
