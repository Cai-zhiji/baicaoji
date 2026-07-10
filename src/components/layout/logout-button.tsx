"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // 即使请求失败也跳转
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-1 rounded-md px-2 py-1 text-sm transition-colors hover:bg-[var(--danger-soft)]"
      style={{ color: "var(--muted)" }}
      title="退出登录"
    >
      <LogOut className="h-4 w-4" />
      <span className="hidden sm:inline">退出</span>
    </button>
  );
}
