import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { compareSync } from "bcryptjs";
import { sessionOptions, SessionData } from "@/lib/session";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

export async function POST(request: Request) {
  try {
    if (!ADMIN_USERNAME || !ADMIN_PASSWORD_HASH) {
      console.error("[auth] ADMIN_USERNAME or ADMIN_PASSWORD_HASH not configured");
      return Response.json({ error: "服务器未配置登录凭据" }, { status: 500 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.username !== "string" || typeof body.password !== "string") {
      return Response.json({ error: "请提供账号和密码" }, { status: 400 });
    }

    const { username, password } = body;

    if (username !== ADMIN_USERNAME || !compareSync(password, ADMIN_PASSWORD_HASH)) {
      return Response.json({ error: "账号或密码错误" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions,
    );

    session.isLoggedIn = true;
    await session.save();

    return Response.json({ success: true });
  } catch (err) {
    console.error("[auth] login error:", err instanceof Error ? err.message : err);
    return Response.json({ error: "登录失败" }, { status: 500 });
  }
}
