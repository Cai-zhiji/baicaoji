import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions,
    );

    session.destroy();

    return Response.json({ success: true });
  } catch (err) {
    console.error("[auth] logout error:", err instanceof Error ? err.message : err);
    return Response.json({ error: "登出失败" }, { status: 500 });
  }
}
