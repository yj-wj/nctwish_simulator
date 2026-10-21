import assert from "node:assert/strict";
import { test } from "node:test";
import { MockAIProvider } from "../ai/mockProvider.ts";
import { buildChatContext } from "../game/chatContextBuilder.ts";
import { createChatTurnId, executeChatTransaction, getChatThreadId, processChatTurn } from "../game/chatEngine.ts";
import { buildStoryGenerationInput } from "../game/contextBuilder.ts";
import { evaluateAction } from "../game/ruleEngine.ts";
import { initialStoryFlags } from "../config/history.ts";
import type { ChatDomainState, ChatTurnInput } from "../types/chat.ts";
import type { GameState } from "../types/game.ts";
import type { MemoryRecord } from "../types/memory.ts";

function gameState(affection = 10): GameState {
  return {
    gameId: "chat-test", week: 4, currentScene: "练习室外", careerStage: "回归期",
    player: { name: "测试玩家", age: 24, identityId: "student", fanLevelId: "passerby" },
    maleLead: "sion", gameMode: "standard",
    stats: { affection, popularity: 10, mood: 65, money: 1800, secrecy: 88, companyAlert: 25, careerPressure: 60 },
  };
}

function domain(affection = 10): ChatDomainState {
  return {
    gameState: gameState(affection), eventHistory: [], choiceHistory: [], weeklyHistory: [],
    storyFlags: { ...initialStoryFlags }, memories: [], processedSettlementIds: [],
    chatThreads: [], chatMessages: [], chatTurns: [],
  };
}

const provider = new MockAIProvider();
const services = { generateChat: provider.generateChat.bind(provider), now: () => new Date("2026-10-22T12:00:00.000Z") };
const threadId = getChatThreadId("sion");

test("Chat basic: player message produces mock AI reply and stable message history", async () => {
  const result = await processChatTurn(domain(), { kind: "player_message", threadId, content: "今天是不是很累？不用马上回复我。" }, services);
  assert.equal(result.chatMessages[0].source, "player");
  assert.equal(result.chatMessages.slice(1).every(({ source }) => source === "ai"), true);
  assert.equal(result.chatThreads[0].id, "player:sion");
  assert.equal(result.chatTurns.length, 1);
});

test("Stranger boundary: overly intimate chat cannot confirm relationship", async () => {
  const result = await processChatTurn(domain(10), { kind: "player_message", threadId, content: "宝宝，我今晚去你家睡。" }, services);
  assert.ok(result.trace.ruleEvaluation.violatedRules.includes("relationshipMismatch"));
  assert.equal(result.storyFlags.relationshipConfirmed, false);
  assert.equal(result.chatMessages.some(({ content }) => content.includes("没有熟到")), true);
});

test("Normal chat no effect: casual goodnight does not change state or Choice History", async () => {
  const current = domain(40);
  const result = await processChatTurn(current, { kind: "player_message", threadId, content: "晚安。" }, services);
  assert.deepEqual(result.gameState.stats, current.gameState.stats);
  assert.equal(result.choiceHistory.length, 0);
  assert.equal(result.memories.length, 0);
  assert.equal(result.trace.proposal.effectCategory, "none");
});

test("same explicit chatTurnId cannot settle twice", async () => {
  const input: ChatTurnInput = { kind: "player_message", threadId, content: "晚安。", turnId: "chat:fixed-turn" };
  const first = await processChatTurn(domain(), input, services);
  const next: ChatDomainState = {
    gameState: first.gameState, eventHistory: first.eventHistory, choiceHistory: first.choiceHistory, weeklyHistory: first.weeklyHistory,
    storyFlags: first.storyFlags, memories: first.memories, processedSettlementIds: first.processedSettlementIds,
    chatThreads: first.chatThreads, chatMessages: first.chatMessages, chatTurns: first.chatTurns,
  };
  await assert.rejects(() => processChatTurn(next, input, services), /already been settled/);
});

test("important Chat writes shared relationship Memory and Story Context can retrieve it", async () => {
  const result = await processChatTurn(domain(60), { kind: "player_message", threadId, content: "我希望你以后公司压力大的时候不要突然消失，我很害怕失联。" }, services);
  assert.equal(result.memories.length, 1);
  assert.equal(result.memories[0].visibility, "shared");
  const story = buildStoryGenerationInput({
    gameState: result.gameState, currentEvent: null, eventHistory: result.eventHistory, memories: result.memories,
    storyFlags: result.storyFlags, viewerId: "player", playerAction: { type: "continue" },
  });
  assert.equal(story.context.relevantMemories.some(({ summary }) => summary.includes("害怕")), true);
});

test("relationship chat effect diminishes inside the same-week cooldown window", async () => {
  const first = await processChatTurn(domain(60), { kind: "player_message", threadId, content: "我希望你以后不要突然消失，我害怕失联。", turnId: "chat:first" }, services);
  const next: ChatDomainState = {
    gameState: first.gameState, eventHistory: first.eventHistory, choiceHistory: first.choiceHistory, weeklyHistory: first.weeklyHistory,
    storyFlags: first.storyFlags, memories: first.memories, processedSettlementIds: first.processedSettlementIds,
    chatThreads: first.chatThreads, chatMessages: first.chatMessages, chatTurns: first.chatTurns,
  };
  const second = await processChatTurn(next, { kind: "player_message", threadId, content: "我还是希望你不要突然消失，我很害怕失联。", turnId: "chat:second" }, services);
  assert.equal(second.gameState.stats.affection, first.gameState.stats.affection);
  assert.equal(second.trace.proposal.spamLimited, true);
});

test("male-lead Chat Context excludes manager-only Hidden Memory", () => {
  const hidden: MemoryRecord = {
    id: "manager-only", gameId: "chat-test", week: 3, type: "hidden", content: "经纪人准备限制联系。",
    actors: ["npc:manager"], tags: ["company"], importance: 5, emotion: null, visibility: "hidden", knownBy: ["npc:manager"],
    source: { kind: "outcome", settlementId: "hidden" }, createdAtSequence: 1,
  };
  const current = domain(); current.memories = [hidden];
  const input: ChatTurnInput = { kind: "player_message", threadId, content: "今天还好吗？" };
  const rule = evaluateAction(current.gameState, { type: "privateMessage", romanticIntensity: "low", physicalIntimacy: "none", publicExposure: "none", professionalBoundary: "respected" });
  const context = buildChatContext(current, input, rule);
  assert.equal(JSON.stringify(context).includes("限制联系"), false);
  assert.equal(context.context.diagnostics.excludedHiddenMemories, 1);
});

test("failed AI generation causes zero mutation and no persistence", async () => {
  const current = domain();
  const before = structuredClone(current);
  let persists = 0;
  await assert.rejects(() => executeChatTransaction(current, { kind: "player_message", threadId, content: "你好" }, {
    generateChat: async () => { throw new Error("provider failed"); },
  }, { persist: () => { persists += 1; }, commit: () => { throw new Error("must not commit"); } }), /provider failed/);
  assert.equal(persists, 0);
  assert.deepEqual(current, before);
});

test("incoming trigger creates unread AI messages without background agent behavior", async () => {
  const current = domain();
  const trigger = { id: "incoming:test", threadId, senderId: "sion", reason: "career_pressure_check_in" as const, contextTags: ["career"], week: 4, status: "pending" as const };
  const result = await processChatTurn(current, { kind: "incoming", trigger }, services);
  assert.equal(result.chatMessages.every(({ source }) => source === "ai"), true);
  assert.equal(result.chatThreads[0].unreadCount, result.chatMessages.length);
  assert.deepEqual(result.gameState.stats, current.gameState.stats);
});
