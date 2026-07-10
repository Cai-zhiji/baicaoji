import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseCsvLine } from "@/lib/csv";
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
      return NextResponse.json(
        { error: "CSV 文件为空或只有表头" },
        { status: 400 }
      );
    }

    const header = parseCsvLine(lines[0]).map((h) => h.replace(/"/g, ""));
    const nameIdx = header.findIndex(
      (h) => h === "姓名" || h.toLowerCase() === "name"
    );
    const genderIdx = header.findIndex(
      (h) => h === "性别" || h.toLowerCase() === "gender"
    );
    const ageIdx = header.findIndex(
      (h) => h === "年龄" || h.toLowerCase() === "age"
    );
    const phoneIdx = header.findIndex(
      (h) =>
        h === "电话" || h === "联系电话" || h.toLowerCase() === "phone"
    );

    if (nameIdx === -1) {
      return NextResponse.json(
        { error: "CSV 缺少「姓名」列，请确保表头包含：姓名, 性别, 年龄, 电话" },
        { status: 400 }
      );
    }

    // Preload existing patients
    const existingPatients = await prisma.patient.findMany({ select: { name: true } });
    const existingNames = new Set(existingPatients.map((p) => p.name));

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

      const genderRaw = genderIdx !== -1 ? cols[genderIdx]?.trim() : "";
      const gender =
        genderRaw === "女" ? "女" : genderRaw === "男" ? "男" : "男";
      const age =
        ageIdx !== -1 ? parseInt(cols[ageIdx]) || null : null;
      const phone =
        phoneIdx !== -1 ? cols[phoneIdx]?.trim() || null : null;

      try {
        await prisma.patient.create({
          data: { name, gender, age, phone },
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
      message: `成功导入 ${created} 条${skipped > 0 ? `，跳过 ${skipped} 条（重复或空姓名）` : ""}`,
    });
  } catch (err) {
    return handleApiError(err, "CSV 导入失败");
  }
}
