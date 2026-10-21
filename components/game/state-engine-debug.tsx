"use client";

import { useState } from "react";
import { getCharacter } from "@/config/characters";
import { eventPool } from "@/config/event-pool";
import { mockChoiceEffects, mockChoiceLabels } from "@/config/mock-choice-effects";
import { useGameStore } from "@/store/game-store";
import type { CharacterBoundaryId } from "@/types/character";
import type { GameStats } from "@/types/game";
import type { StoryChoice } from "@/types/ui";

const statLabels: Record<keyof GameStats, string> = {
  affection: "好感",
  popularity: "人气",
  mood: "心情",
  money: "金钱",
  secrecy: "保密",
  companyAlert: "公司警觉",
  careerPressure: "事业压力",
};

function StatSnapshot({ stats }: { stats: GameStats }) {
  return <div className="state-snapshot">{Object.entries(stats).map(([stat, value]) => <span key={stat}>{statLabels[stat as keyof GameStats]} <b>{value}</b></span>)}</div>;
}

export function StateEngineDebug() {
  const gameState = useGameStore((state) => state.gameState);
  const selectedEventId = useGameStore((state) => state.selectedEventId);
  const stateChangeLog = useGameStore((state) => state.stateChangeLog);
  const applyMockChoice = useGameStore((state) => state.applyMockChoice);
  const [eventId, setEventId] = useState(selectedEventId ?? eventPool[0].id);
  const [choiceId, setChoiceId] = useState<StoryChoice["id"]>("B");
  const [boundaryId, setBoundaryId] = useState<CharacterBoundaryId | "">("");
  if (!gameState) return null;
  const character = getCharacter(gameState.maleLead);
  const lastChange = stateChangeLog.at(-1);

  return <section className="engine-debug-block" aria-label="State Engine Debug">
    <h3>State Engine</h3>
    <div className="engine-debug-controls">
      <label>Mock Event<select aria-label="Mock Event" value={eventId} onChange={(event) => setEventId(event.target.value)}>{eventPool.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label>
      <label>Mock Choice<select aria-label="Mock Choice" value={choiceId} onChange={(event) => setChoiceId(event.target.value as StoryChoice["id"])}>{(["A", "B", "C"] as const).map((id) => <option key={id} value={id}>{id} · {mockChoiceLabels[id]}</option>)}</select></label>
      <label>Character Taboo<select aria-label="Character Taboo" value={boundaryId} onChange={(event) => setBoundaryId(event.target.value as CharacterBoundaryId | "")}><option value="">不触发</option>{character.romanceTaboos.map((taboo) => <option key={taboo.id} value={taboo.id}>{taboo.title}</option>)}</select></label>
      <button className="button primary debug-generate" type="button" onClick={() => applyMockChoice(eventId, choiceId, boundaryId || undefined)}>Apply Mock Choice</button>
    </div>
    <p className="debug-effect-line"><strong>Effects</strong> {Object.entries(mockChoiceEffects[choiceId]).map(([stat, magnitude]) => `${stat}:${magnitude}`).join(" · ")}</p>
    {lastChange ? <div className="state-change-preview">
      <div><strong>Before State</strong><StatSnapshot stats={lastChange.before} /></div>
      <div><strong>After State</strong><StatSnapshot stats={lastChange.after} /></div>
      <p><strong>Relationship Stage Change</strong> {lastChange.relationshipStageBefore} → {lastChange.relationshipStageAfter}</p>
      <p><strong>Applied</strong> {lastChange.resolvedEffects.map(({ stat, appliedDelta }) => `${stat} ${appliedDelta >= 0 ? "+" : ""}${appliedDelta}`).join(" · ")}</p>
      <p><strong>Modifiers</strong> {lastChange.modifiers.join(", ") || "none"}</p>
    </div> : <p className="debug-empty">尚无 State Change Log。</p>}
    <details className="debug-details"><summary>State Change Log · {stateChangeLog.length}</summary><div className="debug-event-list">{stateChangeLog.map((entry, index) => <p key={`${entry.eventId}-${entry.choiceId}-${index}`}><span>第 {entry.week} 周 · {entry.eventId} · Choice {entry.choiceId}</span><small>{entry.resolvedEffects.map(({ stat, appliedDelta }) => `${stat}:${appliedDelta >= 0 ? "+" : ""}${appliedDelta}`).join(" · ")}</small></p>)}</div></details>
  </section>;
}

