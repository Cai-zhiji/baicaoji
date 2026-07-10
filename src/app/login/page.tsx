"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("请输入账号和密码");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "登录失败");
        return;
      }

      await router.push("/");
      router.refresh();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex min-h-dvh items-center justify-center px-4"
      style={{ background: "var(--bg)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl px-6 py-10"
        style={{
          background: "var(--surface)",
          boxShadow: "var(--glass-shadow-lg)",
        }}
      >
        {/* Logo / Title */}
        <div className="mb-8 text-center">
          <h1
            className="text-[26px] font-[590] tracking-[-0.01em]"
            style={{ color: "var(--accent)" }}
          >
            百草计
          </h1>
          <p
            className="mt-1.5 text-sm"
            style={{ color: "var(--muted)" }}
          >
            请登录以继续
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Message */}
          {error && (
            <div
              className="rounded-lg px-3 py-2.5 text-sm"
              style={{
                background: "var(--danger-soft)",
                color: "var(--danger)",
              }}
            >
              {error}
            </div>
          )}

          {/* Username */}
          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              style={{ color: "var(--fg-secondary)" }}
            >
              账号
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入账号"
              autoComplete="username"
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
                color: "var(--fg)",
              }}
            />
          </div>

          {/* Password */}
          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              style={{ color: "var(--fg-secondary)" }}
            >
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              autoComplete="current-password"
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
                color: "var(--fg)",
              }}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
            style={{
              background: "var(--accent)",
              color: "var(--on-accent)",
            }}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {loading ? "登录中…" : "登 录"}
          </button>
        </form>
      </div>
    </div>
  );
}
