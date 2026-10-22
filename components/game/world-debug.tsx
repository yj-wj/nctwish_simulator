"use client";

import { getNPC } from "@/config/npcs";
import { buildWorldContext } from "@/game/worldContextBuilder";
import { useGameStore } from "@/store/game-store";
import { DEBUG_MODE_ENABLED } from "@/config/debug";
import type { WorldTriggerType } from "@/types/world";

const fixtureTypes: WorldTriggerType[] = [
  "relationship_confirmed", "exposure_started", "public_opinion_crisis", "company_intervention",
  "career_breakdown", "temporary_distance", "major_argument", "financial_crisis",
];

export function WorldDebug() {
  const state = useGameStore();
  if (!DEBUG_MODE_ENABLED || !state.gameState) return null;
  const context = buildWorldContext({
    gameState: state.gameState, worldState: state.worldState, storyFlags: state.storyFlags,
    eventHistory: state.eventHistory, memories: state.memories, viewerId: "player",
    chatTurns: state.chatTurns, snsPosts: state.snsPosts, snsTriggers: state.snsTriggers,
  });
  return <details className="debug-details"><summary>Phase 6C · World / NPC</summary>
    <div className="event-debug-summary">
      <span>Active NPC <b>{state.worldState.npcStates.filter(({ active }) => active).length}</b></span>
      <span>Pending Trigger <b>{state.worldState.triggers.filter(({ status }) => status === "pending").length}</b></span>
      <span>Processed Trigger <b>{state.worldState.processedTriggerIds.length}</b></span>
      <span>Active Crisis <b>{context.activeCrises.map(({ id }) => id).join(", ") || "none"}</b></span>
    </div>
    <div className="debug-checkpoints">{fixtureTypes.map((type) => <button key={type} type="button" onClick={() => state.applyWorldFixture(type)}>{type}</button>)}</div>
    <div className="debug-event-list">
      {state.worldState.npcStates.map((npcState) => <p key={npcState.npcId}><span>{getNPC(npcState.npcId).name} · {npcState.active ? "active" : npcState.known ? "known" : "hidden"}</span><small>trust {npcState.relationship.trust} · close {npcState.relationship.closeness} · tension {npcState.relationship.tension} · knownBy {npcState.knownBy.join(", ") || "none"}</small></p>)}
    </div>
    <details className="debug-details"><summary>Trigger Queue / Recent Effects</summary><div className="debug-event-list">
      {state.worldState.triggers.map((trigger) => <p key={trigger.id}><span>{trigger.type} · {trigger.status}</span><small>{trigger.source}:{trigger.sourceId} · actors {trigger.actorIds.join(", ")}</small></p>)}
      {state.worldState.recentEffects.map((effect) => <p key={effect.id}><span>{effect.target} · {effect.triggerType}</span><small>{effect.summary}</small></p>)}
    </div></details>
    <details className="debug-details"><summary>World Context Budget</summary><pre>{JSON.stringify(context, null, 2)}</pre></details>
  </details>;
}
