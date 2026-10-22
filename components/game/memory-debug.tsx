"use client";

import { useMemo, useState } from "react";
import { memoryTestFixtures } from "@/config/history-fixtures";
import { getRecentMemories, getRelevantMemories, isMemoryVisibleTo } from "@/game/memoryEngine";
import { useGameStore } from "@/store/game-store";
import { DEBUG_MODE_ENABLED } from "@/config/debug";
import type { EntityId, ScoredMemory } from "@/types/memory";

export function MemoryDebug() {
  const gameState = useGameStore((state) => state.gameState);
  const memories = useGameStore((state) => state.memories);
  const applyFixture = useGameStore((state) => state.applyHistoryTestFixture);
  const [fixtureId, setFixtureId] = useState(memoryTestFixtures[0].id);
  const [viewerId, setViewerId] = useState<EntityId>("player");
  const [actorId, setActorId] = useState<EntityId | "">("");
  const [tag, setTag] = useState("relationship");
  const [recent, setRecent] = useState<string[]>([]);
  const [relevant, setRelevant] = useState<ScoredMemory[]>([]);

  const entityOptions = useMemo(() => gameState ? [
    { id: "player" as EntityId, label: "Player" },
    { id: gameState.maleLead as EntityId, label: `Male lead · ${gameState.maleLead}` },
    { id: "npc:manager" as EntityId, label: "Manager" },
  ] : [], [gameState]);

  if (!DEBUG_MODE_ENABLED || !gameState) return null;

  const hiddenManagerMemory = memories.find((memory) =>
    memory.type === "hidden" && memory.knownBy.includes("npc:manager"));

  const runRecent = () => {
    setRecent(getRecentMemories(memories, { viewerId, limit: 5 }).map(({ id }) => id));
  };
  const runRelevant = () => {
    setRelevant(getRelevantMemories(memories, {
      currentWeek: gameState.week,
      viewerId,
      actors: actorId ? [actorId] : undefined,
      tags: tag.trim() ? [tag.trim()] : undefined,
      limit: 5,
    }));
  };

  return <section className="engine-debug-block memory-debug-block" aria-label="Structured Memory Debug">
    <h3>Structured Memory</h3>
    <p className="debug-context-note">Memory 是未来 AI context；History / Story Flags 仍是规则与结局的权威事实。当前 Store 共 {memories.length} 条 Memory。</p>

    <details className="debug-details" open>
      <summary>Structured Memory Store · {memories.length}</summary>
      <div className="debug-event-list memory-store-list">{memories.length ? memories.map((memory) => <p key={memory.id}>
        <span>第 {memory.week} 周 · {memory.type} · importance {memory.importance}</span>
        <b>{memory.content}</b>
        <small>id: {memory.id}</small>
        <small>actors: {memory.actors.join(", ") || "none"} · tags: {memory.tags.join(", ") || "none"}</small>
        <small>visibility: {memory.visibility} · knownBy: {memory.knownBy.join(", ") || "none"}</small>
        <small>source: {memory.source.kind} · {memory.source.settlementId}</small>
      </p>) : <p><span>尚无正式 Structured Memory</span></p>}</div>
    </details>

    <details className="debug-details">
      <summary>Memory Test Fixtures</summary>
      <p className="debug-context-note">Fixture 必须经过 structured settlement → History / Flags → Memory Engine；重复 settlement 不会重复写入。</p>
      <div className="fixture-controls">
        <select aria-label="Memory Test Fixture" value={fixtureId} onChange={(event) => setFixtureId(event.target.value)}>{memoryTestFixtures.map((fixture) => <option key={fixture.id} value={fixture.id}>{fixture.label}</option>)}</select>
        <button className="button primary debug-generate" type="button" onClick={() => applyFixture(fixtureId)}>Apply Memory Fixture</button>
      </div>
    </details>

    <div className="memory-retrieval-controls">
      <label>Viewer<select aria-label="Memory Viewer" value={viewerId} onChange={(event) => setViewerId(event.target.value as EntityId)}>{entityOptions.map((entity) => <option key={entity.id} value={entity.id}>{entity.label}</option>)}</select></label>
      <label>Actor<select aria-label="Memory Actor" value={actorId} onChange={(event) => setActorId(event.target.value as EntityId | "")}><option value="">Any actor</option>{entityOptions.map((entity) => <option key={entity.id} value={entity.id}>{entity.label}</option>)}</select></label>
      <label>Tag<input aria-label="Memory Tag" value={tag} onChange={(event) => setTag(event.target.value)} /></label>
    </div>

    <div className="fixture-controls">
      <button className="button secondary debug-generate" type="button" onClick={runRecent}>Get Recent 5</button>
      <button className="button primary debug-generate" type="button" onClick={runRelevant}>Run Relevant Retrieval</button>
    </div>

    <details className="debug-details" open>
      <summary>Recent Memory Retrieval · {recent.length}</summary>
      <div className="debug-event-list">{recent.length ? recent.map((id) => {
        const memory = memories.find((item) => item.id === id);
        return memory ? <p key={id}><span>{memory.type} · 第 {memory.week} 周</span><small>{memory.content}</small></p> : null;
      }) : <p><span>点击 Get Recent 5 执行查询</span></p>}</div>
    </details>

    <details className="debug-details" open>
      <summary>Relevant Memory Retrieval · {relevant.length}</summary>
      <div className="debug-event-list">{relevant.length ? relevant.map(({ memory, score, breakdown }) => <p key={memory.id}>
        <span>{memory.type} · score {score}</span>
        <b>{memory.content}</b>
        <small>actorMatch +{breakdown.actorMatch} · tagMatch +{breakdown.tagMatch} · importance +{breakdown.importance} · recency +{breakdown.recency} · type +{breakdown.memoryType}</small>
      </p>) : <p><span>设置 viewer / actor / tag 后执行查询</span></p>}</div>
    </details>

    <div className="ending-derived" aria-label="Hidden Memory Visibility Test">
      <strong>Hidden Memory Test</strong>
      <p><span>Player viewer</span><b>{hiddenManagerMemory ? String(isMemoryVisibleTo(hiddenManagerMemory, "player")) : "no fixture"}</b></p>
      <p><span>Manager viewer</span><b>{hiddenManagerMemory ? String(isMemoryVisibleTo(hiddenManagerMemory, "npc:manager")) : "no fixture"}</b></p>
    </div>
  </section>;
}
