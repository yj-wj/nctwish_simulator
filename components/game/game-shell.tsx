"use client";

import type { ReactNode } from "react";
import { MapPin, CalendarDays, Heart } from "lucide-react";
import { useGameStore } from "@/store/game-store";
import { getCharacter } from "@/config/characters";
import { getRelationshipStage } from "@/game/relationship";
import { SiteHeader } from "@/components/common/site-header";
import { RouteGuard } from "@/components/common/route-guard";
import { StatStrip } from "./stat-strip";
import { BottomNav } from "./bottom-nav";
import { RelationshipDebug } from "./relationship-debug";

export function GameShell({ children }: { children: ReactNode }) {
  const gameState = useGameStore((state) => state.gameState);
  if (!gameState) return <RouteGuard stage="game"><></></RouteGuard>;
  const character = getCharacter(gameState.maleLead);
  const relationshipStage = getRelationshipStage(gameState.stats.affection);
  return <RouteGuard stage="game"><SiteHeader /><main id="main-content" className="game-shell">
    <div className="game-context"><div className="week-label"><CalendarDays size={17} /><strong>第 {gameState.week} 周</strong><span>CHAPTER 01</span></div><div className="context-details"><span><MapPin size={15} />{gameState.currentScene}</span><span>{character.name}（{character.displayName}）</span><span className="relationship-pill"><Heart size={13} />{relationshipStage.name}</span></div></div>
    <StatStrip stats={gameState.stats} /><div className="preview-banner"><span className="status-dot" /><span>Phase 6A · 主剧情与 AI Chat 共享 GameState、规则、记忆与存档。</span></div>
    <RelationshipDebug />
    {children}
  </main><BottomNav /></RouteGuard>;
}
