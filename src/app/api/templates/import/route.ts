import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseCsvLine } from "@/lib/csv";
import { toPinyin } from "@/lib/pinyin";
import { handleApiError } from "@/services/errors";

/**
 * 解析 "药材名" 或 "药材名 克数g" 格式
 */
function parseHerbWithGrams(raw: string): { name: string; grams: number } {
  const match = raw.trim().match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*g?$/);
  if (match) {
    return { name: match[1].trim(), grams: parseFloat(match[2]) };
  }
  return { name: raw.trim(), grams: 0 };
}

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
      return NextResponse.json(
        { error: "CSV 文件为空或只有表头" },
        { status: 400 }
      );
    }

    const header = parseCsvLine(lines[0]).map((h) => h.replace(/"/g, ""));
    const nameIdx = header.findIndex(
      (h) => h === "模版名称" || h === "名称" || h.toLowerCase() === "name"
    );
    const herbsIdx = header.findIndex(
      (h) =>
        h === "药材" ||
        h === "药材列表" ||
        h.toLowerCase() === "herbs" ||
        h.toLowerCase() === "items"
    );

    if (nameIdx === -1) {
      return NextResponse.json(
        { error: "CSV 缺少「模版名称」列" },
        { status: 400 }
      );
    }

    // Preload all herbs + existing templates
    const allHerbs = await prisma.herb.findMany({
      select: { id: true, name: true },
    });
    const herbMap = new Map(allHerbs.map((h) => [h.name, h.id]));
    const existingTemplates = await prisma.template.findMany({
      select: { name: true },
    });
    const existingNames = new Set(existingTemplates.map((t) => t.name));

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]).map((c) => c.replace(/^"|"$/g, ""));
      const tplName = cols[nameIdx]?.trim();
      const herbNamesStr = herbsIdx !== -1 ? cols[herbsIdx]?.trim() : "";

      if (!tplName) {
        skipped++;
        continue;
      }

      // 重复则跳过
      if (existingNames.has(tplName)) {
        skipped++;
        continue;
      }

      if (!herbNamesStr) {
        skipped++;
        continue;
      }

      // 分割药材
      const rawItems = herbNamesStr
        .split(/[|、，,\n]/)
        .map((n) => n.trim())
        .filter(Boolean);

      if (rawItems.length === 0) {
        skipped++;
        continue;
      }

      const templateItems: Array<{ herbId: number; grams: number }> = [];
      for (const raw of rawItems) {
        const { name, grams } = parseHerbWithGrams(raw);
        let id = herbMap.get(name);
        // 药材不存在则自动创建
        if (!id) {
          const herb = await prisma.herb.create({
            data: {
              name,
              pinyin: toPinyin(name),
              sellPrice: 0,
              costPrice: 0,
            },
          });
          id = herb.id;
          herbMap.set(name, id);
        }
        templateItems.push({ herbId: id, grams });
      }

      if (templateItems.length === 0) {
        skipped++;
        continue;
      }

      try {
        await prisma.template.create({
          data: {
            name: tplName,
            items: {
              create: templateItems,
            },
          },
        });
        existingNames.add(tplName);
        created++;
      } catch {
        errors.push(`模版「${tplName}」导入失败`);
      }
    }

    return NextResponse.json({
      success: true,
      created,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      message: `成功导入 ${created} 个模版${skipped > 0 ? `，跳过 ${skipped} 个（重复或数据不完整）` : ""}`,
    });
  } catch (err) {
    return handleApiError(err, "模版导入失败");
  }
}
