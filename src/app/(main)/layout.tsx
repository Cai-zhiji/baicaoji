import { AppSidebar } from "@/components/layout/app-sidebar";
import { SwRegister } from "@/components/layout/sw-register";
import { ElderlyToggle } from "@/components/layout/elderly-toggle";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SwRegister />
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
          <ElderlyToggle />
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
