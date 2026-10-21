"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useGameStore } from "@/store/game-store";

export function RouteGuard({ stage, children }: { stage: "player" | "character" | "game"; children: ReactNode }) {
  const router = useRouter();
  const hydrated = useGameStore((state) => state.hasHydrated);
  const player = useGameStore((state) => state.playerConfirmed);
  const character = useGameStore((state) => state.characterConfirmed);
  const entered = useGameStore((state) => state.entered);
  const destination = !player ? "/create" : stage !== "player" && !character ? "/characters" : stage === "game" && !entered ? "/character-card" : null;

  useEffect(() => { if (hydrated && destination) router.replace(destination); }, [destination, hydrated, router]);
  if (!hydrated) return <main className="guard-message"><p>正在读取游戏状态……</p></main>;
  if (destination) return <main className="guard-message"><p>请先完成角色创建。</p><Link className="button primary" href={destination}>继续创建角色</Link><p className="muted">创建流程和 GameState 会由统一 Store 管理。</p></main>;
  return children;
}
