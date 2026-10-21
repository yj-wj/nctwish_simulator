"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUIStore } from "@/store/ui-store";

export function RouteGuard({ stage, children }: { stage: "player" | "character" | "game"; children: ReactNode }) {
  const router = useRouter();
  const player = useUIStore((state) => state.playerConfirmed);
  const character = useUIStore((state) => state.characterConfirmed);
  const entered = useUIStore((state) => state.entered);
  const destination = !player ? "/create" : stage !== "player" && !character ? "/characters" : stage === "game" && !entered ? "/character-card" : null;

  useEffect(() => { if (destination) router.replace(destination); }, [destination, router]);
  if (destination) return <main className="guard-message"><p>请先完成角色创建。</p><Link className="button primary" href={destination}>继续创建角色</Link><p className="muted">当前为界面预览，刷新后需重新创建。</p></main>;
  return children;
}
