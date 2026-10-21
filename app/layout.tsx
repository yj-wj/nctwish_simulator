import type { Metadata } from "next";
import { GameStoreHydrator } from "@/components/common/game-store-hydrator";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Garden · 你的心动故事", template: "%s | Garden" },
  description: "NCT WISH 平行世界互动剧情游戏。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><GameStoreHydrator /><a href="#main-content" className="skip-link">跳转到主要内容</a>{children}</body></html>;
}
