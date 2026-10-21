"use client";

import { getMatchedTriggers, getRelationshipRule } from "@/game/ruleEngine";
import { useGameStore } from "@/store/game-store";

const checkpoints = [10, 20, 40, 60, 70, 85, 95] as const;

export function RelationshipDebug() {
  const gameState = useGameStore((state) => state.gameState);
  const setAffection = useGameStore((state) => state.setAffection);

  if (process.env.NODE_ENV !== "development" || !gameState) return null;

  const relationshipRule = getRelationshipRule(gameState);
  const matchedTriggers = getMatchedTriggers(gameState);
  const affection = gameState.stats.affection;
  return <section className="relationship-debug" aria-label="关系阶段开发测试">
    <div><strong>Phase 3A Debug</strong><span>affection {affection} → {relationshipRule.stage.name} / {relationshipRule.allowedInteractionLevel}</span><span>matchedTriggers: {matchedTriggers.map(({ id }) => id).join(", ") || "none"}</span></div>
    <label htmlFor="debug-affection">快速修改好感度</label>
    <input id="debug-affection" type="range" min={0} max={100} value={affection} onChange={(event) => setAffection(Number(event.target.value))} />
    <div className="debug-checkpoints">{checkpoints.map((value) => <button key={value} type="button" onClick={() => setAffection(value)}>{value}</button>)}</div>
  </section>;
}

