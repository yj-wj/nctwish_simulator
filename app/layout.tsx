import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Garden · 你的心动故事", template: "%s | Garden" },
  description: "NCT WISH 平行世界互动剧情游戏。Phase 1 Web UI Skeleton，仅使用样例数据。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><a href="#main-content" className="skip-link">跳转到主要内容</a>{children}</body></html>;
}
