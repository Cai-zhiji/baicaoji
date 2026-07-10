"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PenLine, ScrollText, Users, Leaf, BarChart3, BookOpen } from "lucide-react";

const TABS = [
  { href: "/", label: "开方", icon: PenLine },
  { href: "/prescriptions", label: "药方", icon: ScrollText },
  { href: "/patients", label: "病人", icon: Users },
  { href: "/herbs", label: "药材", icon: Leaf },
  { href: "/templates", label: "模版", icon: BookOpen },
  { href: "/stats", label: "统计", icon: BarChart3 },
];

export function AppSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="flex shrink-0 items-stretch justify-around border-t pb-[env(safe-area-inset-bottom,6px)]"
      style={{
        height: "var(--tabbar-h)",
        background: "var(--glass-bg-heavy)",
        backdropFilter: "blur(var(--glass-blur-lg)) saturate(1.2)",
        WebkitBackdropFilter: "blur(var(--glass-blur-lg)) saturate(1.2)",
        borderColor: "var(--glass-border)",
      }}
    >
      {TABS.map((tab) => {
        const active = isActive(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors",
              active ? "text-(--accent)" : "text-(--muted) hover:text-(--fg)"
            )}
          >
            {active && (
              <span
                className="absolute top-0 left-1/4 right-1/4 h-[2px] rounded-full"
                style={{ background: "var(--accent)" }}
              />
            )}
            <tab.icon
              className="h-[20px] w-[20px]"
              strokeWidth={active ? 2 : 1.5}
            />
            <span
              className="text-[10px] leading-none"
              style={{ fontWeight: active ? 590 : 400 }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
