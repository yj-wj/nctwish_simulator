"use client";

import { getCharacter } from "@/config/characters";
import { getNPC } from "@/config/npcs";
import { getVisibleMemories } from "@/game/memoryEngine";
import { useGameStore } from "@/store/game-store";

export function WorldPeople() {
  const gameState = useGameStore((state) => state.gameState);
  const worldState = useGameStore((state) => state.worldState);
  const memories = useGameStore((state) => state.memories);
  if (!gameState) return null;
  const lead = getCharacter(gameState.maleLead);
  const visibleMemories = getVisibleMemories(memories, "player");
  const knownNPCs = worldState.npcStates.filter(({ known, knownBy }) => known && knownBy.includes("player"));
  return <div className="people-grid">
    <article className="paper-panel person-card lead-card">
      <p className="eyebrow">CURRENT MALE LEAD</p>
      <h2>{lead.name}<small>{lead.displayName}</small></h2>
      <p>{lead.publicPersona}</p>
      <div className="tag-list">{lead.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
      <small>这里只显示公开设定与玩家已经获得的事实。</small>
    </article>
    {knownNPCs.map((state) => {
      const npc = getNPC(state.npcId);
      const memoryCount = visibleMemories.filter(({ actors }) => actors.includes(npc.id)).length;
      return <article className="paper-panel person-card" key={npc.id}>
        <p className="eyebrow">{state.active ? "ACTIVE IN WORLD" : "KNOWN PERSON"}</p>
        <h2>{npc.name}<small>{npc.roleLabel}</small></h2>
        <p>{npc.publicDescription}</p>
        <dl><div><dt>信任</dt><dd>{state.relationship.trust}</dd></div><div><dt>亲近</dt><dd>{state.relationship.closeness}</dd></div><div><dt>紧张</dt><dd>{state.relationship.tension}</dd></div></dl>
        <div className="tag-list">{npc.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
        <small>玩家可见记忆 {memoryCount} 条</small>
      </article>;
    })}
  </div>;
}
