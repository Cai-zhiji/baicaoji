import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/layout/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "百草计",
  description: "中医开方计价工具",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "百草计",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* 老年模式防闪烁：在 hydration 之前读取 localStorage */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try { if (localStorage.getItem("elderly-mode") === "true") { document.documentElement.classList.add("elderly"); } } catch(e) {}`,
          }}
        />
      </head>
      <body className="min-h-full">
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
