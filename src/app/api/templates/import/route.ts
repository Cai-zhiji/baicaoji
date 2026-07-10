import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseCsvLine } from "@/lib/csv";
import { handleApiError } from "@/services/errors";

/**
 * 解析药材字符串，支持多种格式：
 *   "黄芪 15g"     → { name: "黄芪", grams: 15 }
 *   "大枣 12枚"    → { name: "大枣", grams: 0, unit: "枚", unitVal: 12 }
 *   "杏仁 70个"    → { name: "杏仁", grams: 0, unit: "个", unitVal: 70 }
 *   "半夏 半升"    → { name: "半夏", grams: 0, unit: "升", unitVal: 0.5 }
 *   "生姜 9片"     → { name: "生姜", grams: 0, unit: "片", unitVal: 9 }
 */
function parseHerbWithGrams(raw: string): {
  name: string;
  grams: number;
  unit?: string;
  unitVal?: number;
} {
  const trimmed = raw.trim();

  // Try "名称 数值单位" pattern (like 大枣 12枚)
  const unitMatch = trimmed.match(
    /^(.+?)\s+(\d+(?:\.\d+)?)\s*(枚|个|片|升|合|尺)$/
  );
  if (unitMatch) {
    return {
      name: unitMatch[1].trim(),
      grams: 0, // will be resolved via herb's unitGrams
      unit: unitMatch[3],
      unitVal: parseFloat(unitMatch[2]),
    };
  }

  // Try 半升/半合 pattern
  const halfMatch = trimmed.match(/^(.+?)\s+(半)(升|合)$/);
  if (halfMatch) {
    return {
      name: halfMatch[1].trim(),
      grams: 0,
      unit: halfMatch[3],
      unitVal: 0.5,
    };
  }

  // Standard "名称 克数g" or "名称 克数" format
  const match = trimmed.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*g?$/);
  if (match) {
    return { name: match[1].trim(), grams: parseFloat(match[2]) };
  }

  return { name: trimmed, grams: 0 };
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
      select: { id: true, name: true, unitGrams: true },
    });
    const herbMap = new Map(allHerbs.map((h) => [h.name, h.id]));
    const herbUnitMap = new Map(allHerbs.map((h) => [h.id, h.unitGrams]));
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

      const templateItems: Array<{ herbId: number | null; herbName: string; grams: number }> = [];
      let unmatchedHerbs = 0;
      for (const raw of rawItems) {
        const { name, grams, unit, unitVal } = parseHerbWithGrams(raw);
        const id = herbMap.get(name) ?? null;
        let finalGrams = grams;

        // 药材存在 → 关联 herbId + 单位转换
        if (id) {
          if (unit && unitVal && grams === 0) {
            const unitGrams = herbUnitMap.get(id);
            if (unitGrams) {
              finalGrams = unitVal * unitGrams;
            } else {
              const defaultConversions: Record<string, number> = {
                '枚': 1, '个': 0.4, '片': 3, '升': 20, '合': 2,
              };
              finalGrams = unitVal * (defaultConversions[unit] || 1);
            }
          }
        } else {
          // 药材不存在 → 仅保留名称，保证方剂完整性
          unmatchedHerbs++;
          if (unit && unitVal) {
            const defaultConversions: Record<string, number> = {
              '枚': 1, '个': 0.4, '片': 3, '升': 20, '合': 2,
            };
            finalGrams = unitVal * (defaultConversions[unit] || 1);
          }
        }

        templateItems.push({ herbId: id, herbName: name, grams: finalGrams });
      }

      if (unmatchedHerbs > 0) {
        errors.push(`模版「${tplName}」有 ${unmatchedHerbs} 味药材未录入系统，仅保留名称`);
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
