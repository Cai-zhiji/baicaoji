import { NextRequest, NextResponse } from "next/server";
import { getStats } from "@/services/stats";

const VALID_PERIODS = ["all", "monthly", "quarterly"] as const;
type Period = (typeof VALID_PERIODS)[number];

export async function GET(request: NextRequest) {
  try {
    const rawPeriod = request.nextUrl.searchParams.get("period") || "all";
    const period: Period = VALID_PERIODS.includes(rawPeriod as Period)
      ? (rawPeriod as Period)
      : "all";

    const stats = await getStats(period);
    return NextResponse.json(stats);
  } catch {
    return NextResponse.json({ error: "加载统计数据失败" }, { status: 500 });
  }
}
