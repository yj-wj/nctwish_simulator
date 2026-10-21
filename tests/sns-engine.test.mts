import assert from "node:assert/strict";
import { test } from "node:test";
import { MockAIProvider } from "../ai/mockProvider.ts";
import { initialStoryFlags } from "../config/history.ts";
import { buildStoryGenerationInput } from "../game/contextBuilder.ts";
import { buildSNSContext } from "../game/snsContextBuilder.ts";
import { executeSNSTransaction, processSNSTrigger } from "../game/snsEngine.ts";
import { deriveSNSTrigger } from "../game/snsTriggerEngine.ts";
import type { GameState } from "../types/game.ts";
import type { MemoryRecord } from "../types/memory.ts";
import type { SNSDomainState, SNSGenerationTrigger } from "../types/sns.ts";

function gameState(): GameState {
  return {
    gameId: "sns-test", week: 8, currentScene: "仁川机场", careerStage: "回归期",
    player: { name: "测试玩家", age: 24, identityId: "student", fanLevelId: "passerby" },
    maleLead: "sion", gameMode: "standard",
    stats: { affection: 50, popularity: 50, mood: 60, money: 1600, secrecy: 70, companyAlert: 40, careerPressure: 55 },
  };
}

function domain(): SNSDomainState {
  return {
    gameState: gameState(), eventHistory: [], choiceHistory: [], weeklyHistory: [],
    storyFlags: { ...initialStoryFlags }, memories: [], processedSettlementIds: [], snsPosts: [], snsTriggers: [],
  };
}

function exposureTrigger(): SNSGenerationTrigger {
  return {
    id: "sns:turn-1:exposure_leak", reason: "exposure_leak", level: "crisis", week: 8,
    sourceEventId: "crisis_cafe_secret_photo", sourceTurnId: "turn-1", sourceCategory: "crisis",
    sourceTags: ["paparazzi", "media", "privacy", "high-risk"], publicTitle: "咖啡店偷拍视频",
    publicSummary: "公开网络上出现了一段咖啡店偷拍视频。", status: "pending",
  };
}

const provider = new MockAIProvider();
const services = { generateSNS: provider.generateSNS.bind(provider), now: () => new Date("2026-10-22T12:00:00.000Z") };

test("ordinary private turn does not create an SNS trigger", () => {
  const state = gameState();
  const trigger = deriveSNSTrigger({
    gameId: state.gameId, week: state.week, sourceTurnId: "ordinary", sourceCategory: "daily",
    sourceTags: ["daily-life"], publicTitle: "普通的一天", publicSummary: "没有公开事件。", outcomeTags: [],
    beforeState: state, afterState: structuredClone(state),
  });
  assert.equal(trigger, null);
});

test("structured exposure creates a crisis SNS trigger", () => {
  const before = gameState();
  const after = structuredClone(before); after.stats.secrecy = 20;
  const trigger = deriveSNSTrigger({
    gameId: before.gameId, week: before.week, sourceTurnId: "exposure", sourceCategory: "crisis",
    sourceTags: ["paparazzi", "media", "privacy", "high-risk"], publicTitle: "偷拍视频", publicSummary: "画面已公开传播。",
    outcomeTags: ["major_exposure"], beforeState: before, afterState: after,
  });
  assert.equal(trigger?.reason, "paparazzi_exposure");
  assert.equal(trigger?.level, "crisis");
});

test("SNS settlement uses State Engine and writes Event History, flags and public-opinion Memory", async () => {
  const current = domain(); current.snsTriggers = [exposureTrigger()];
  const result = await processSNSTrigger(current, current.snsTriggers[0], services);
  assert.equal(result.gameState.stats.secrecy, 62);
  assert.equal(result.gameState.stats.companyAlert, 48);
  assert.equal(result.gameState.stats.mood, 55);
  assert.equal(result.storyFlags.majorExposureOccurred, true);
  assert.equal(result.eventHistory[0].outcomeTags.includes("major_exposure"), true);
  assert.equal(result.memories.some(({ tags }) => tags.includes("public-opinion")), true);
  assert.equal(result.choiceHistory.length, 0);
  assert.equal(result.snsPosts.length, 1);
});

test("SNS Context never includes Hidden Memory or private relationship facts", () => {
  const current = domain();
  const hidden: MemoryRecord = {
    id: "hidden", gameId: "sns-test", week: 7, type: "hidden", content: "经纪人私下掌握了恋情证据。",
    actors: ["npc:manager"], tags: ["company"], importance: 5, emotion: null, visibility: "hidden", knownBy: ["npc:manager"],
    source: { kind: "outcome", settlementId: "hidden" }, createdAtSequence: 1,
  };
  current.memories = [hidden]; current.storyFlags.relationshipConfirmed = true;
  const context = buildSNSContext(current, exposureTrigger());
  const serialized = JSON.stringify(context);
  assert.equal(serialized.includes("掌握了恋情证据"), false);
  assert.equal(serialized.includes("relationshipConfirmed"), false);
  assert.equal(context.context.diagnostics.excludedHiddenMemories, 1);
});

test("important SNS Memory is retrievable by subsequent Story Context", async () => {
  const current = domain(); current.snsTriggers = [exposureTrigger()];
  const result = await processSNSTrigger(current, current.snsTriggers[0], services);
  const story = buildStoryGenerationInput({
    gameState: result.gameState, currentEvent: null, eventHistory: result.eventHistory,
    memories: result.memories, storyFlags: result.storyFlags, viewerId: "player", playerAction: { type: "continue" },
  });
  assert.equal(story.context.relevantMemories.some(({ tags }) => tags.includes("public-opinion")), true);
  assert.equal(story.context.storyFacts.includes("majorExposureOccurred"), true);
});

test("failed SNS AI causes zero mutation and no persistence", async () => {
  const current = domain(); current.snsTriggers = [exposureTrigger()];
  const before = structuredClone(current); let persists = 0;
  await assert.rejects(() => executeSNSTransaction(current, current.snsTriggers[0], {
    generateSNS: async () => { throw new Error("provider failed"); },
  }, { persist: () => { persists += 1; }, commit: () => { throw new Error("must not commit"); } }), /provider failed/);
  assert.equal(persists, 0);
  assert.deepEqual(current, before);
});

test("same SNS trigger cannot settle twice", async () => {
  const current = domain(); current.snsTriggers = [exposureTrigger()];
  const first = await processSNSTrigger(current, current.snsTriggers[0], services);
  const next: SNSDomainState = {
    gameState: first.gameState, eventHistory: first.eventHistory, choiceHistory: first.choiceHistory,
    weeklyHistory: first.weeklyHistory, storyFlags: first.storyFlags, memories: first.memories,
    processedSettlementIds: first.processedSettlementIds, snsPosts: first.snsPosts, snsTriggers: first.snsTriggers,
  };
  await assert.rejects(() => processSNSTrigger(next, exposureTrigger(), services), /already been processed/);
});
