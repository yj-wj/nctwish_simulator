"use client";

import { useMemo } from "react";
import { getEventTemplate } from "@/config/event-pool";
import { gameModeConfig } from "@/config/game-modes";
import { runEventEngine } from "@/game/eventEngine";
import { getMatchedTriggers, getRelationshipRule } from "@/game/ruleEngine";
import { useGameStore } from "@/store/game-store";
import type { EventCategory } from "@/types/event";
import type { GameState, StatId } from "@/types/game";

const checkpoints = [10, 20, 40, 60, 70, 85, 95] as const;
const debugStats: { id: StatId; label: string; max: number }[] = [
  { id: "affection", label: "好感", max: 100 },
  { id: "popularity", label: "人气", max: 100 },
  { id: "mood", label: "心情", max: 100 },
  { id: "money", label: "金钱", max: 10000 },
  { id: "secrecy", label: "保密", max: 100 },
  { id: "companyAlert", label: "公司警觉", max: 100 },
  { id: "careerPressure", label: "事业压力", max: 100 },
];
const categoryLabels: Record<EventCategory, string> = {
  daily: "日常",
  relationship: "感情",
  career: "韩娱工作",
  publicOpinion: "粉圈舆论",
  company: "公司",
  reality: "现实",
  entertainment: "圈内大瓜",
  crisis: "危机",
};

export function RelationshipDebug() {
  const gameState = useGameStore((state) => state.gameState);
  const eventHistory = useGameStore((state) => state.eventHistory);
  const eventSeed = useGameStore((state) => state.eventSeed);
  const storedResult = useGameStore((state) => state.eventEngineResult);
  const selectedEventId = useGameStore((state) => state.selectedEventId);
  const setAffection = useGameStore((state) => state.setAffection);
  const setDebugStat = useGameStore((state) => state.setDebugStat);
  const setDebugGameMode = useGameStore((state) => state.setDebugGameMode);
  const generate = useGameStore((state) => state.generateNextMockEvent);
  const previewResult = useMemo(
    () => process.env.NODE_ENV === "development" && gameState
      ? runEventEngine(gameState, { history: eventHistory, seed: eventSeed })
      : null,
    [eventHistory, eventSeed, gameState],
  );

  if (process.env.NODE_ENV !== "development" || !gameState) return null;

  const relationshipRule = getRelationshipRule(gameState);
  const matchedTriggers = getMatchedTriggers(gameState);
  const result = storedResult ?? previewResult;
  const selected = storedResult?.selectedEvent?.event
    ?? (selectedEventId ? getEventTemplate(selectedEventId) : undefined);

  return <section className="relationship-debug" aria-label="Phase 3B 开发测试">
    <header className="debug-summary">
      <div><strong>Phase 3B Debug</strong><span>Current State · 第 {gameState.week} 周 · {relationshipRule.stage.name} · {gameState.gameMode}</span></div>
      <span>Interaction · {relationshipRule.allowedInteractionLevel}</span>
      <span>matchedTriggers · {matchedTriggers.map(({ id }) => id).join(", ") || "none"}</span>
    </header>

    <div className="debug-controls">
      <label>剧情模式<select value={gameState.gameMode} onChange={(event) => setDebugGameMode(event.target.value as GameState["gameMode"])}>{gameModeConfig.map((mode) => <option key={mode.id} value={mode.id}>{mode.name}</option>)}</select></label>
      {debugStats.map(({ id, label, max }) => <label key={id}>{label}<input aria-label={`Debug ${label}`} type="number" min={0} max={max} value={gameState.stats[id]} onChange={(event) => setDebugStat(id, Number(event.target.value))} /></label>)}
    </div>

    <div className="debug-checkpoints" aria-label="好感度快速检查">{checkpoints.map((value) => <button key={value} type="button" onClick={() => setAffection(value)}>{value}</button>)}</div>
    <button className="button primary debug-generate" type="button" onClick={generate}>Generate Next Mock Event</button>

    <div className="event-debug-summary">
      <span>Eligible Events <b>{result?.eligibleEvents.length ?? 0}</b></span>
      <span>Filtered Events <b>{result?.filteredEvents.length ?? 0}</b></span>
      <span>Selected Event <b>{selected?.title ?? "尚未记录"}</b></span>
      <span>Event History <b>{eventHistory.length}</b></span>
    </div>

    <details className="debug-details"><summary>Eligible Events / Final Weight</summary><div className="debug-event-list">
      {result?.eligibleEvents.map(({ event, weight }) => <p key={event.id}><span>{event.title} · {categoryLabels[event.category]}</span><b>{weight.finalWeight}</b><small>base {weight.baseWeight} × mode {weight.gameModeModifier} × relation {weight.relationshipModifier} × trigger {weight.triggerModifier} × career {weight.careerStageModifier} × recent {weight.recentEventPenalty}</small></p>)}
    </div></details>
    <details className="debug-details"><summary>Filtered Events / Reason</summary><div className="debug-event-list">
      {result?.filteredEvents.map(({ event, reasons }) => <p key={event.id}><span>{event.title}</span><small>{reasons.map(({ code }) => code).join(", ")}</small></p>)}
    </div></details>
    <details className="debug-details"><summary>Event History</summary><div className="debug-event-list">
      {eventHistory.length ? eventHistory.map((entry, index) => <p key={`${entry.eventId}-${index}`}><span>第 {entry.week} 周 · {entry.eventId}</span><small>{categoryLabels[entry.category]}</small></p>) : <p><span>尚无事件记录</span></p>}
    </div></details>
  </section>;
}
