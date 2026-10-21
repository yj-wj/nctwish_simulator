import assert from "node:assert/strict";
import test from "node:test";
import { MockAIProvider } from "../ai/mockProvider.ts";
import type { AIProviderResult } from "../ai/provider.ts";
import type { ActionInterpretationInput, ActionInterpretationOutput, StoryGenerationInput, StoryGenerationOutput } from "../ai/schemas.ts";
import { initialStoryFlags } from "../config/history.ts";
import { buildEndingContext } from "../game/endingContextBuilder.ts";
import { evaluateEndingCandidates } from "../game/endingEngine.ts";
import {
  createTurnId,
  executeTurnTransaction,
  processTurn,
  sanitizeSuggestedEffects,
  validateControlledTags,
} from "../game/turnEngine.ts";
import { evaluateAction } from "../game/ruleEngine.ts";
import type { MemoryRecord } from "../types/memory.ts";
import type { TurnAIServices } from "../game/turnEngine.ts";
import type { TurnDomainState, TurnPlayerInput } from "../types/turn.ts";

function gameState(affection = 8) {
  return {
    gameId: "turn-test",
    week: 1,
    currentScene: "首尔汝矣岛电视台后门",
    careerStage: "回归期" as const,
    player: { name: "林间", age: 23, identityId: "student" as const, fanLevelId: "casual" as const },
    maleLead: "riku" as const,
    gameMode: "standard" as const,
    stats: { affection, popularity: 35, mood: 65, money: 2300, secrecy: 80, companyAlert: 15, careerPressure: 45 },
  };
}

function domain(affection = 8, memories: MemoryRecord[] = []): TurnDomainState {
  return {
    gameState: gameState(affection),
    eventHistory: [],
    choiceHistory: [],
    weeklyHistory: [],
    storyFlags: { ...initialStoryFlags },
    memories,
    processedSettlementIds: [],
    selectedEventId: null,
    selectedEventRecordId: null,
    eventSeed: 3,
  };
}

function preset(text: string, effects = {}, tags: TurnPlayerInput extends never ? never : string[] = []): TurnPlayerInput {
  return {
    kind: "preset_choice",
    choice: { id: "B", text, effects, tags: tags as never },
  };
}

function services(provider = new MockAIProvider()) {
  let actionCalls = 0;
  let storyCalls = 0;
  const value: TurnAIServices & { counts(): { action: number; story: number } } = {
    async interpretAction(input) { actionCalls += 1; return provider.interpretAction(input); },
    async generateStory(input) { storyCalls += 1; return provider.generateStory(input); },
    counts: () => ({ action: actionCalls, story: storyCalls }),
  };
  return value;
}

test("Preset Choice completes a full turn without calling Action Interpreter", async () => {
  const ai = services();
  const result = await processTurn(domain(), preset("礼貌地回应他的帮助。", { mood: "small_positive" }, ["maintain_relationship"]), ai);
  assert.deepEqual(ai.counts(), { action: 0, story: 1 });
  assert.equal(result.processedSettlementIds.length, 1);
  assert.equal(result.choiceHistory.length, 1);
  assert.equal(result.weeklyHistory.length, 1);
  assert.equal(result.memories.length, 1);
  assert.equal(result.trace.actionInterpretation, null);
  assert.equal(result.trace.storyOutput.title.length > 0, true);
});

test("Free Action calls interpreter, feeds Rule Engine and records self-protection tags", async () => {
  const ai = services();
  const result = await processTurn(domain(), {
    kind: "free_action",
    text: "这里人太多了，我先拉开距离，晚点再联系。",
  }, ai);
  assert.deepEqual(ai.counts(), { action: 1, story: 1 });
  assert.equal(result.trace.actionInterpretation?.semanticTags.includes("self_protection"), true);
  assert.equal(result.choiceHistory[0].choiceTags.includes("self_protection"), true);
  assert.equal(result.choiceHistory[0].choiceTags.includes("keep_distance"), true);
});

test("Case A: stranger confession is high risk, narratively rejected and cannot confirm relationship", async () => {
  const result = await processTurn(domain(10), preset("我直接跟他告白，说我爱他。"), services());
  assert.equal(result.trace.ruleEvaluation.riskLevel, "high");
  assert.equal(result.trace.ruleEvaluation.violatedRules.includes("relationshipMismatch"), true);
  assert.match(result.story.story, /没有被直接接受|拉开了距离/);
  assert.equal(result.storyFlags.relationshipConfirmed, false);
  assert.equal(result.gameState.stats.affection <= 10, true);
});

test("Case B: ambiguous relationship accepts bounded positive affection without stage leap", async () => {
  const result = await processTurn(domain(60), preset(
    "我问他今晚结束以后能不能单独聊一下。",
    { affection: "small_positive" },
    ["maintain_relationship"],
  ), services());
  assert.equal(result.gameState.stats.affection > 60, true);
  assert.equal(result.gameState.stats.affection <= 65, true);
  assert.equal(result.trace.relationshipStageAfter, "ambiguous");
});

test("Case D: public risk allows State Engine to lower secrecy and raise company alert", async () => {
  const current = domain(40);
  current.gameState = { ...current.gameState, stats: { ...current.gameState.stats, popularity: 80, secrecy: 20 } };
  const result = await processTurn(current, preset("我在粉丝和镜头前公开走向他。", {}, ["maintain_relationship"]), services());
  assert.equal(result.trace.ruleEvaluation.riskLevel === "moderate" || result.trace.ruleEvaluation.riskLevel === "high", true);
  assert.equal(result.gameState.stats.secrecy < 20, true);
  assert.equal(result.gameState.stats.companyAlert > current.gameState.stats.companyAlert, true);
});

test("Case E: player Story Context excludes manager-only Hidden Memory", async () => {
  const hidden: MemoryRecord = {
    id: "hidden-1", gameId: "test", week: 1, type: "hidden", content: "经纪人准备秘密干预。",
    actors: ["npc:manager", "riku"], tags: ["manager"], importance: 4, emotion: null,
    visibility: "hidden", knownBy: ["npc:manager"],
    source: { kind: "outcome", settlementId: "hidden-settlement" }, createdAtSequence: 1,
  };
  const result = await processTurn(domain(8, [hidden]), preset("继续完成自己的工作。", {}, ["career"]), services());
  assert.equal(JSON.stringify(result.trace.storyContext).includes("经纪人准备秘密干预"), false);
  assert.equal(result.trace.storyContext.context.diagnostics.excludedMemoriesByVisibility, 1);
});

test("Effect and tag sanitizers reject illegal, duplicate and rule-conflicting suggestions", () => {
  const state = gameState(10);
  const action = { type: "confession", romanticIntensity: "high", physicalIntimacy: "none", publicExposure: "low", professionalBoundary: "respected" } as const;
  const rule = evaluateAction(state, action);
  const result = sanitizeSuggestedEffects([
    { stat: "finalAffection", magnitude: "large_positive", reason: "illegal" },
    { stat: "affection", magnitude: "medium_positive", reason: "mismatch" },
    { stat: "mood", magnitude: "small_negative", reason: "valid" },
    { stat: "mood", magnitude: "large_negative", reason: "duplicate" },
  ], action, rule);
  assert.equal(result.effects.mood, "small_negative");
  assert.equal(result.effects.affection, undefined);
  assert.deepEqual(result.rejected.map(({ rejectionReason }) => rejectionReason), ["invalid_stat", "rule_conflict", "duplicate_stat"]);
  assert.deepEqual(validateControlledTags(["self_protection", "invented_tag"], "choice"), {
    accepted: ["self_protection"], rejected: ["invented_tag"],
  });
});

test("AI cannot directly control Story Flags; guarded outcome mapping rejects early confirmation", async () => {
  const mock = new MockAIProvider();
  const custom: TurnAIServices = {
    interpretAction: (input) => mock.interpretAction(input),
    generateStory: async (input) => {
      const generated = await mock.generateStory(input);
      return { ...generated, data: { ...generated.data, suggestedOutcomeTags: ["relationship_confirmed"] } };
    },
  };
  const result = await processTurn(domain(10), preset("我直接跟他告白。"), custom);
  assert.equal(result.trace.settlementProposal.acceptedOutcomeTags.includes("relationship_confirmed"), true);
  assert.equal(result.trace.settlementProposal.flagEffects.length, 0);
  assert.equal(result.storyFlags.relationshipConfirmed, false);
});

test("Memory Candidates become validated player-visible MemoryEffects and deduplicate existing content", async () => {
  const first = await processTurn(domain(), preset("继续眼前的安排。"), services());
  assert.equal(first.memories.length, 1);
  assert.equal(first.memories[0].visibility === "shared" || first.memories[0].visibility === "player_known", true);
  const secondDomain: TurnDomainState = {
    ...domain(),
    memories: first.memories,
    selectedEventRecordId: "second-event",
    eventSeed: 4,
  };
  const second = await processTurn(secondDomain, preset("继续眼前的安排。"), services());
  assert.equal(second.memories.length, 1);
  assert.equal(second.trace.settlementProposal.rejectedMemories.some(({ reason }) => reason === "duplicate_memory"), true);
});

test("failed generation causes zero mutation and no transaction persist or commit", async () => {
  const current = domain();
  const before = JSON.stringify(current);
  const broken: TurnAIServices = {
    interpretAction: async () => { throw new Error("not used"); },
    generateStory: async () => { throw new Error("provider unavailable"); },
  };
  let persisted = 0;
  let committed = 0;
  await assert.rejects(() => executeTurnTransaction(current, preset("礼貌回应。"), broken, {
    persist: () => { persisted += 1; },
    commit: () => { committed += 1; },
  }), /provider unavailable/);
  assert.equal(JSON.stringify(current), before);
  assert.equal(persisted, 0);
  assert.equal(committed, 0);
});

test("successful transaction persists once before one commit; persist failure prevents commit", async () => {
  const current = domain();
  const order: string[] = [];
  await executeTurnTransaction(current, preset("礼貌回应。"), services(), {
    persist: () => { order.push("persist"); return "saved"; },
    commit: (_result, saved) => { assert.equal(saved, "saved"); order.push("commit"); },
  });
  assert.deepEqual(order, ["persist", "commit"]);

  let committed = false;
  await assert.rejects(() => executeTurnTransaction(current, preset("礼貌回应。"), services(), {
    persist: () => { throw new Error("storage full"); },
    commit: () => { committed = true; },
  }), /storage full/);
  assert.equal(committed, false);
});

test("duplicate settlement is rejected before any AI call", async () => {
  const input = preset("礼貌回应。", {}, ["maintain_relationship"]);
  const current = domain();
  current.processedSettlementIds = [`${createTurnId(current, input)}:settlement`];
  const ai = services();
  await assert.rejects(() => processTurn(current, input, ai), /already been settled/);
  assert.deepEqual(ai.counts(), { action: 0, story: 0 });
});

test("Ending Context is rebuilt from the settled authoritative histories", async () => {
  const result = await processTurn(domain(), preset("继续自己的安排。", {}, ["self_growth"]), services());
  const context = buildEndingContext(result.gameState, result.weeklyHistory, result.choiceHistory, result.eventHistory, result.storyFlags);
  const expected = evaluateEndingCandidates(result.gameState, context).candidates.map(({ id }) => id);
  assert.deepEqual(result.trace.endingCandidates.map(({ id }) => id), expected);
});

test("invalid and overlong free actions fail before any provider request", async () => {
  const ai = services();
  await assert.rejects(() => processTurn(domain(), { kind: "free_action", text: "   " }, ai), /请先写下/);
  await assert.rejects(() => processTurn(domain(), { kind: "free_action", text: "x".repeat(501) }, ai), /500/);
  assert.deepEqual(ai.counts(), { action: 0, story: 0 });
});

