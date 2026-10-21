"use client";

import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { useGameStore } from "@/store/game-store";

export function StartButton() {
  const router = useRouter();
  const hasHydrated = useGameStore((state) => state.hasHydrated);
  const activeSaveId = useGameStore((state) => state.activeSaveId);
  const saveSummaries = useGameStore((state) => state.saveSummaries);
  const startNewGame = useGameStore((state) => state.startNewGame);
  const loadSave = useGameStore((state) => state.loadSave);

  const continueGame = () => {
    const saveId = activeSaveId ?? saveSummaries[0]?.saveId;
    if (!saveId || !loadSave(saveId)) return;
    const state = useGameStore.getState();
    router.push(state.entered ? "/game" : state.characterConfirmed ? "/character-card" : state.playerConfirmed ? "/characters" : "/create");
  };

  return <div className="landing-save-actions">
    <button className="button primary start-button" onClick={() => { startNewGame(); router.push("/create"); }}>New Game · 开始游戏 <ArrowUpRight size={21} /></button>
    <button className="button secondary continue-button" disabled={!hasHydrated || saveSummaries.length === 0} onClick={continueGame}>Continue · 继续游戏</button>
  </div>;
}
