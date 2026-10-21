"use client";

import type { ReactNode } from "react";
import { MapPin, CalendarDays, Heart } from "lucide-react";
import { useUIStore } from "@/store/ui-store";
import { getCharacter } from "@/mocks/characters";
import { previewContext } from "@/mocks/story";
import { SiteHeader } from "@/components/common/site-header";
import { RouteGuard } from "@/components/common/route-guard";
import { StatStrip } from "./stat-strip";
import { BottomNav } from "./bottom-nav";

export function GameShell({ children }: { children: ReactNode }) {
  const lead = useUIStore((state) => state.draft.maleLead);
  const character = getCharacter(lead);
  return <RouteGuard stage="game"><SiteHeader /><main id="main-content" className="game-shell">
    <div className="game-context"><div className="week-label"><CalendarDays size={17} /><strong>第 {previewContext.week} 周</strong><span>CHAPTER 01</span></div><div className="context-details"><span><MapPin size={15} />{previewContext.scene}</span><span>{character.name}（{character.stageName}）</span><span className="relationship-pill"><Heart size={13} />{previewContext.relationship}</span></div></div>
    <StatStrip /><div className="preview-banner"><span className="status-dot" /><span>界面预览 · 剧情、数值与动态均为样例；操作不会推进周数或结算属性。</span></div>
    {children}
  </main><BottomNav /></RouteGuard>;
}
