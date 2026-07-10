import { AppSidebar } from "@/components/layout/app-sidebar";
import { SwRegister } from "@/components/layout/sw-register";
import { ElderlyToggle } from "@/components/layout/elderly-toggle";
import { LogoutButton } from "@/components/layout/logout-button";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SwRegister />
      {/* PWA theme-color: 跟随系统主题 */}
      <meta name="theme-color" media="(prefers-color-scheme: light)" content="#fafaf9" />
      <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1c1917" />
      <div className="flex h-dvh flex-col bg-(--bg)">
        {/* Top bar */}
        <header
          className="flex shrink-0 items-center justify-between border-b px-4"
          style={{
            height: "var(--topbar-h)",
            borderColor: "var(--border)",
          }}
        >
          <span
            className="text-[18px] font-[590] tracking-[-0.01em]"
            style={{ color: "var(--fg)" }}
          >
            百草计
          </span>
          <div className="flex items-center gap-1">
            <LogoutButton />
            <ElderlyToggle />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-4 py-3">
          {children}
        </main>

        {/* Bottom tab bar */}
        <AppSidebar />
      </div>
    </>
  );
}
