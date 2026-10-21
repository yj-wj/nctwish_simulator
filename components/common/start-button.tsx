"use client";

import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { useGameStore } from "@/store/game-store";

export function StartButton() {
  const router = useRouter();
  const reset = useGameStore((state) => state.reset);
  return <button className="button primary start-button" onClick={() => { reset(); router.push("/create"); }}>开始游戏 <ArrowUpRight size={21} /></button>;
}
