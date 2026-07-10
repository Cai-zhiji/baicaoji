import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (username !== "wsd" || password !== "112233") {
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
  } catch {
    return Response.json({ error: "登录失败" }, { status: 400 });
  }
}
