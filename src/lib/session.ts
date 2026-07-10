import { SessionOptions } from "iron-session";

export interface SessionData {
  isLoggedIn: boolean;
}

export const defaultSession: SessionData = {
  isLoggedIn: false,
};

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  throw new Error(
    "SESSION_SECRET 环境变量未设置。请生成一个至少 32 字符的随机字符串并设置到 .env 文件中。\n" +
    "示例：openssl rand -base64 32"
  );
}

export const sessionOptions: SessionOptions = {
  password: SESSION_SECRET,
  cookieName: "baicaoji-auth",
  cookieOptions: {
    // 30 天免登录
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  },
};
