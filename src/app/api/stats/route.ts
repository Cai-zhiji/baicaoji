import { NextRequest, NextResponse } from "next/server";
import { getStats } from "@/services/stats";

export async function GET(request: NextRequest) {
  try {
    const period =
      (request.nextUrl.searchParams.get("period") as
        | "all"
        | "monthly"
        | "quarterly") || "all";

    const stats = await getStats(period);
    return NextResponse.json(stats);
  } catch {
    return NextResponse.json({ error: "加载统计数据失败" }, { status: 500 });
  }
}
