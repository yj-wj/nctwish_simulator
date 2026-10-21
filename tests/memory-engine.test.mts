import assert from "node:assert/strict";
import { test } from "node:test";
import { getHistoryTestFixture } from "../config/history-fixtures.ts";
import { initialStoryFlags } from "../config/history.ts";
import {
  addMemory,
  getCharacterMemories,
  getRecentMemories,
  getRelevantMemories,
  getVisibleMemories,
} from "../game/memoryEngine.ts";
import { processStructuredSettlement } from "../game/settlementPipeline.ts";
import type { GameState, GameStats } from "../types/game.ts";
import type { HistorySettlementInput } from "../types/history.ts";
import type { MemoryEffect, MemoryRecord, MemoryWriteContext } from "../types/memory.ts";

const stats: GameStats = {
  affection: 70,
  popularity: 20,
  mood: 60,
  money: 1200,
  secrecy: 80,
  companyAlert: 30,
  careerPressure: 50,
};

function makeState(week = 1): GameState {
  return {
    gameId: "memory-test",
    week,
    currentScene: "测试场景",
    careerStage: "回归期",
    player: { name: "测试玩家", age: 24, identityId: "student", fanLevelId: "passerby" },
    maleLead: "sion",
    gameMode: "standard",
    stats: { ...stats },
  };
}

function context(settlementId: string, week: number): MemoryWriteContext {
  return {
    gameId: "memory-test",
    week,
    maleLeadId: "sion",
    eventId: `event-${settlementId}`,
    choiceId: `choice-${settlementId}`,
    settlementId,
  };
}

function effect(overrides: Partial<MemoryEffect> = {}): MemoryEffect {
  return {
    key: "memory",
    type: "short_term",
    content: "第 {week} 周的测试记忆。",
    actors: ["player", "current_male_lead"],
    tags: ["daily"],
    importance: 2,
    visibility: "shared",
    knownBy: ["player", "current_male_lead"],
    ...overrides,
  };
}

function pipelineState(memories: MemoryRecord[] = []) {
  return {
    weeklyHistory: [],
    choiceHistory: [],
    eventHistory: [],
    storyFlags: { ...initialStoryFlags },
    processedSettlementIds: [],
    memories,
  };
}

function fixtureInput(fixtureId: string, state: GameState): HistorySettlementInput {
  const fixture = getHistoryTestFixture(fixtureId);
  assert.ok(fixture);
  return {
    settlementId: `fixture:${state.gameId}:${fixture.id}`,
    week: state.week,
    event: {
      recordId: fixture.eventRecordId,
      eventId: fixture.eventId,
      category: fixture.category,
      eventTags: fixture.eventTags,
    },
    choice: {
      choiceId: fixture.choiceId,
      choiceText: fixture.choiceText,
      choiceTags: fixture.choiceTags,
      isImportantRelationshipEvent: fixture.isImportantRelationshipEvent,
    },
    beforeState: { ...state.stats },
    afterState: { ...state.stats },
    relationshipStageBefore: "confirmed",
    relationshipStageAfter: "confirmed",
    outcome: fixture.outcome,
  };
}

test("formal memory effect creates a traceable MemoryRecord and does not mutate input", () => {
  const original: MemoryRecord[] = [];
  const next = addMemory(original, effect(), context("settlement-1", 6));
  assert.equal(original.length, 0);
  assert.equal(next.length, 1);
  assert.equal(next[0].content, "第 6 周的测试记忆。");
  assert.deepEqual(next[0].actors, ["player", "sion"]);
  assert.equal(next[0].source.settlementId, "settlement-1");
});

test("same settlement and memory key are idempotent", () => {
  const first = addMemory([], effect(), context("settlement-1", 1));
  const duplicate = addMemory(first, effect(), context("settlement-1", 1));
  assert.equal(duplicate.length, 1);
  assert.equal(duplicate, first);
});

test("recent retrieval returns the latest three visible memories", () => {
  let memories: MemoryRecord[] = [];
  for (let week = 1; week <= 6; week += 1) {
    memories = addMemory(memories, effect({ key: `week-${week}` }), context(`settlement-${week}`, week));
  }
  assert.deepEqual(
    getRecentMemories(memories, { viewerId: "player", limit: 3 }).map(({ week }) => week),
    [6, 5, 4],
  );
});

test("actor and tag overlap receive explicit score bonuses", () => {
  const memories = addMemory([], effect({ tags: ["relationship", "airport"] }), context("scoring", 5));
  const matched = getRelevantMemories(memories, {
    currentWeek: 5,
    viewerId: "player",
    actors: ["sion"],
    tags: ["relationship"],
  })[0];
  const unrelated = getRelevantMemories(memories, {
    currentWeek: 5,
    viewerId: "player",
    actors: ["npc:manager"],
    tags: ["unrelated"],
  })[0];
  assert.equal(matched.breakdown.actorMatch, 4);
  assert.equal(matched.breakdown.tagMatch, 3);
  assert.equal(unrelated.breakdown.actorMatch, 0);
  assert.equal(unrelated.breakdown.tagMatch, 0);
  assert.ok(matched.score > unrelated.score);
  assert.equal(getCharacterMemories(memories, "sion", "player").length, 1);
  assert.equal(getCharacterMemories(memories, "npc:manager", "player").length, 0);
});

test("higher importance wins when other relevance inputs are equal", () => {
  let memories = addMemory([], effect({ key: "low", importance: 1 }), context("low", 4));
  memories = addMemory(memories, effect({ key: "high", importance: 5 }), context("high", 4));
  const result = getRelevantMemories(memories, { currentWeek: 4, viewerId: "player" });
  assert.equal(result[0].memory.importance, 5);
  assert.ok(result[0].score > result[1].score);
});

test("hidden and shared memories obey viewer knowledge scope", () => {
  let memories = addMemory([], effect({
    key: "shared",
    visibility: "shared",
    knownBy: ["player", "current_male_lead"],
  }), context("shared", 1));
  memories = addMemory(memories, effect({
    key: "manager-secret",
    type: "hidden",
    visibility: "hidden",
    actors: ["npc:manager"],
    knownBy: ["npc:manager"],
  }), context("hidden", 1));

  assert.deepEqual(getVisibleMemories(memories, "player").map(({ visibility }) => visibility), ["shared"]);
  assert.deepEqual(getVisibleMemories(memories, "sion").map(({ visibility }) => visibility), ["shared"]);
  assert.deepEqual(getVisibleMemories(memories, "npc:manager").map(({ visibility }) => visibility), ["hidden"]);
});

test("Relationship Confirmed settlement updates Flag and Memory exactly once", () => {
  const state = makeState(8);
  const input = fixtureInput("relationship-confirmed", state);
  const first = processStructuredSettlement(pipelineState(), state, input);
  const duplicate = processStructuredSettlement(first, state, input);

  assert.equal(first.storyFlags.relationshipConfirmed, true);
  assert.equal(first.memories.length, 1);
  assert.equal(first.memories[0].type, "relationship");
  assert.deepEqual(first.memories[0].actors, ["player", "sion"]);
  assert.equal(duplicate.memories.length, 1);
  assert.equal(duplicate.choiceHistory.length, 1);
});
