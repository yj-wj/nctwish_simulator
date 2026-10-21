import type { AIProviderResult } from "../ai/provider.ts";
import type { ChatGenerationInput, ChatGenerationOutput } from "../ai/chatSchemas.ts";
import { CHAT_POLICY } from "../config/chat.ts";
import type { ChatDomainState, ChatMessage, ChatThread, ChatTurnInput, ChatTurnResult, ChatTurnStatus } from "../types/chat.ts";
import type { ChoiceTag, OutcomeTag } from "../types/history.ts";
import type { MemoryEffect, MemoryImportance } from "../types/memory.ts";
import type { StructuredPlayerAction } from "../types/rules.ts";
import type { EffectMagnitude, StateEffects } from "../types/state.ts";
import { buildChatContext } from "./chatContextBuilder.ts";
import { evaluateAction } from "./ruleEngine.ts";
import { processStructuredSettlement } from "./settlementPipeline.ts";
import { settleChoice } from "./stateEngine.ts";
import { sanitizeSuggestedEffects, validateControlledTags, TurnEngineError } from "./turnEngine.ts";

export interface ChatAIServices {
  generateChat(input: ChatGenerationInput): Promise<AIProviderResult<ChatGenerationOutput>>;
  onStatus?: (status: ChatTurnStatus) => void;
  now?: () => Date;
}

export interface ChatTransaction {
  persist(result: ChatTurnResult): Promise<unknown> | unknown;
  commit(result: ChatTurnResult, persisted: unknown): void;
}

function hash(value: string): string {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) { result ^= value.charCodeAt(index); result = Math.imul(result, 16777619); }
  return (result >>> 0).toString(36);
}

export function getChatThreadId(maleLeadId: string): string { return `player:${maleLeadId}`; }

function validateMessage(content: string): string {
  const value = content.trim();
  if (!value) throw new TurnEngineError("invalid_action", "请输入消息内容。");
  if (value.length > CHAT_POLICY.maxMessageLength) throw new TurnEngineError("invalid_action", `消息不能超过 ${CHAT_POLICY.maxMessageLength} 个字符。`);
  return value;
}

function chatAction(text: string): StructuredPlayerAction {
  const intimate = /宝宝|宝贝|亲你|抱你|去你家|一起睡|睡你家/.test(text);
  const confession = /告白|喜欢你|爱你|想你/.test(text);
  const publicExposure = /公开|发微博|发到网上|直播|粉丝/.test(text);
  return {
    type: intimate ? "privateIntimacy" : confession ? "confession" : "privateMessage",
    romanticIntensity: intimate || confession ? "high" : "low",
    physicalIntimacy: intimate ? "intimate" : "none",
    publicExposure: publicExposure ? "high" : "none",
    professionalBoundary: "respected",
  };
}

export function createChatTurnId(state: ChatDomainState, input: ChatTurnInput): string {
  if (input.kind === "incoming") return `chat:${input.trigger.id}`;
  if (input.turnId) return input.turnId;
  const sequence = state.chatMessages.filter(({ threadId }) => threadId === input.threadId).length + 1;
  return `chat:${input.threadId}:${state.gameState.week}:${sequence}:${hash(input.content.trim())}`;
}

function sanitizeChatEffects(
  output: ChatGenerationOutput,
  action: StructuredPlayerAction,
  rule: ReturnType<typeof evaluateAction>,
  state: ChatDomainState,
  threadId: string,
) {
  const sanitized = sanitizeSuggestedEffects(output.suggestedEffects.map((effect) => ({ ...effect, source: "ai" })), action, rule);
  const appliedEffects: StateEffects = { ...sanitized.effects };
  let spamLimited = false;
  if (output.effectCategory === "none") {
    for (const [stat, magnitude] of Object.entries(appliedEffects)) {
      sanitized.rejected.push({ stat, magnitude: String(magnitude), reason: "Casual chat has no formal effect.", source: "ai", rejectionReason: "rule_conflict" });
      delete appliedEffects[stat as keyof StateEffects];
    }
  }
  const recentTurns = state.chatTurns.filter((turn) => turn.threadId === threadId && turn.week === state.gameState.week).slice(-CHAT_POLICY.relationshipEffectCooldownTurns);
  if (output.effectCategory === "relationship" && recentTurns.some(({ effectCategory }) => effectCategory === "relationship")) {
    const affection = appliedEffects.affection;
    if (affection && ["small_positive", "medium_positive", "large_positive"].includes(affection)) {
      sanitized.rejected.push({ stat: "affection", magnitude: affection, reason: "Repeated relationship chat inside cooldown window.", source: "ai", rejectionReason: "rule_conflict" });
      delete appliedEffects.affection;
      spamLimited = true;
    }
  }
  if (appliedEffects.affection && ["medium_positive", "large_positive"].includes(appliedEffects.affection)) {
    sanitized.rejected.push({ stat: "affection", magnitude: appliedEffects.affection, reason: "Chat positive affection is capped at small_positive.", source: "ai", rejectionReason: "rule_conflict" });
    appliedEffects.affection = "small_positive" as EffectMagnitude;
  }
  return { sanitized, appliedEffects, spamLimited };
}

function memoryEffects(output: ChatGenerationOutput, state: ChatDomainState) {
  const existing = new Set(state.memories.map(({ content }) => content.trim().toLocaleLowerCase()));
  const accepted: MemoryEffect[] = [];
  const rejected: Array<{ summary: string; reason: string }> = [];
  if (output.effectCategory === "none") return { accepted, rejected: output.memoryCandidates.map(({ summary }) => ({ summary, reason: "casual_chat" })) };
  for (const candidate of output.memoryCandidates) {
    const validActors = candidate.actors.every((actor) => actor === "player" || actor === state.gameState.maleLead);
    const duplicate = existing.has(candidate.summary.toLocaleLowerCase());
    const reason = !validActors ? "unknown_actor" : candidate.importance < CHAT_POLICY.minimumMemoryImportance ? "low_importance" : duplicate ? "duplicate_memory" : "";
    if (reason) { rejected.push({ summary: candidate.summary, reason }); continue; }
    existing.add(candidate.summary.toLocaleLowerCase());
    accepted.push({
      key: `chat-${hash(candidate.summary)}`,
      type: candidate.type,
      content: candidate.summary,
      actors: ["player", state.gameState.maleLead],
      tags: [...new Set(["chat", ...candidate.tags])],
      importance: candidate.importance as MemoryImportance,
      visibility: "shared",
      knownBy: ["player", state.gameState.maleLead],
      sourceKind: "outcome",
    });
  }
  return { accepted, rejected };
}

function updateThread(threads: ChatThread[], threadId: string, participantId: string, sequence: number, timestamp: string, unreadDelta: number): ChatThread[] {
  const existing = threads.find(({ id }) => id === threadId);
  const next: ChatThread = existing
    ? { ...existing, unreadCount: existing.unreadCount + unreadDelta, updatedAt: timestamp }
    : { id: threadId, playerId: "player", participantId, unreadCount: unreadDelta, lastReadSequence: unreadDelta ? 0 : sequence, createdAt: timestamp, updatedAt: timestamp };
  return [...threads.filter(({ id }) => id !== threadId), next];
}

export async function processChatTurn(state: ChatDomainState, rawInput: ChatTurnInput, services: ChatAIServices): Promise<ChatTurnResult> {
  const input: ChatTurnInput = rawInput.kind === "player_message" ? { ...rawInput, content: validateMessage(rawInput.content) } : rawInput;
  const turnId = createChatTurnId(state, input);
  const settlementId = `${turnId}:settlement`;
  if (state.processedSettlementIds.includes(settlementId) || state.chatTurns.some((turn) => turn.turnId === turnId)) throw new TurnEngineError("duplicate_turn", "This chat turn has already been settled.");
  const action = input.kind === "player_message" ? chatAction(input.content) : chatAction("普通关心");
  const ruleEvaluation = evaluateAction(state.gameState, action);
  const context = buildChatContext(state, input, ruleEvaluation);
  services.onStatus?.("generating");
  const generated = await services.generateChat(context);
  services.onStatus?.("validating");
  const output = generated.data;
  const threadId = input.kind === "player_message" ? input.threadId : input.trigger.threadId;
  const effects = input.kind === "incoming"
    ? { sanitized: sanitizeSuggestedEffects([], action, ruleEvaluation), appliedEffects: {} as StateEffects, spamLimited: false }
    : sanitizeChatEffects(output, action, ruleEvaluation, state, threadId);
  const choiceTags = validateControlledTags<ChoiceTag>(output.suggestedChoiceTags, "choice");
  const outcomeTags = validateControlledTags<OutcomeTag>(output.suggestedOutcomeTags, "outcome");
  const memories = input.kind === "incoming" ? { accepted: [] as MemoryEffect[], rejected: [] as Array<{ summary: string; reason: string }> } : memoryEffects(output, state);
  const meaningful = input.kind === "player_message" && (
    Object.keys(effects.appliedEffects).length > 0 || choiceTags.accepted.length > 0 || outcomeTags.accepted.length > 0 || memories.accepted.length > 0
  );
  services.onStatus?.("settling");
  const transition = settleChoice(state.gameState, effects.appliedEffects, { eventId: `chat:${threadId}`, choiceId: turnId, ruleEvaluation });
  const structured = meaningful ? processStructuredSettlement({
    weeklyHistory: state.weeklyHistory, choiceHistory: state.choiceHistory, eventHistory: state.eventHistory,
    storyFlags: state.storyFlags, processedSettlementIds: state.processedSettlementIds, memories: state.memories,
  }, transition.gameState, {
    settlementId, week: state.gameState.week,
    event: { recordId: `${turnId}:event`, eventId: `chat:${threadId}`, category: "relationship", eventTags: ["relationship-progress"] },
    choice: { choiceId: turnId, choiceText: input.content, choiceTags: choiceTags.accepted, isImportantRelationshipEvent: true },
    beforeState: transition.changeLog.before, afterState: transition.changeLog.after,
    relationshipStageBefore: transition.changeLog.relationshipStageBefore, relationshipStageAfter: transition.changeLog.relationshipStageAfter,
    outcome: { outcomeTags: outcomeTags.accepted, flagEffects: [], eventStatus: "resolved", memoryEffects: memories.accepted },
  }) : {
    weeklyHistory: state.weeklyHistory, choiceHistory: state.choiceHistory, eventHistory: state.eventHistory,
    storyFlags: state.storyFlags, memories: state.memories, processedSettlementIds: [...state.processedSettlementIds, settlementId],
  };
  const now = (services.now ?? (() => new Date()))().toISOString();
  let sequence = state.chatMessages.filter((message) => message.threadId === threadId).reduce((max, message) => Math.max(max, message.sequence), 0);
  const added: ChatMessage[] = [];
  if (input.kind === "player_message") {
    sequence += 1;
    added.push({ id: `${turnId}:player`, threadId, senderId: "player", receiverId: state.gameState.maleLead, content: input.content, week: state.gameState.week, sequence, source: "player", createdAt: now, turnId, settlementId });
  }
  const aiMessageIds: string[] = [];
  output.messages.forEach((content, index) => {
    sequence += 1;
    const id = `${turnId}:ai:${index + 1}`;
    aiMessageIds.push(id);
    added.push({ id, threadId, senderId: state.gameState.maleLead, receiverId: "player", content, week: state.gameState.week, sequence, source: "ai", createdAt: now, turnId, settlementId });
  });
  const chatTurns = [...state.chatTurns, { turnId, settlementId, threadId, week: state.gameState.week, effectCategory: input.kind === "incoming" ? "none" as const : output.effectCategory, meaningful, playerMessageId: input.kind === "player_message" ? `${turnId}:player` : undefined, aiMessageIds }];
  const chatThreads = updateThread(state.chatThreads, threadId, state.gameState.maleLead, sequence, now, input.kind === "incoming" ? output.messages.length : 0);
  return {
    turnId, settlementId, gameState: transition.gameState,
    eventHistory: structured.eventHistory, choiceHistory: structured.choiceHistory, weeklyHistory: structured.weeklyHistory,
    storyFlags: structured.storyFlags, memories: structured.memories, processedSettlementIds: structured.processedSettlementIds,
    chatThreads, chatMessages: [...state.chatMessages, ...added], chatTurns,
    stateChangeLog: meaningful ? transition.changeLog : null,
    trace: {
      turnId, settlementId, input, ruleEvaluation, context, output,
      proposal: {
        effects: effects.sanitized, appliedEffects: effects.appliedEffects, effectCategory: input.kind === "incoming" ? "none" : output.effectCategory,
        spamLimited: effects.spamLimited, acceptedChoiceTags: choiceTags.accepted, rejectedChoiceTags: choiceTags.rejected,
        acceptedOutcomeTags: outcomeTags.accepted, rejectedOutcomeTags: outcomeTags.rejected,
        memoryEffectsCount: memories.accepted.length, rejectedMemories: memories.rejected,
      },
      beforeState: state.gameState, afterState: transition.gameState, metadata: generated.metadata,
    },
  };
}

export async function executeChatTransaction(state: ChatDomainState, input: ChatTurnInput, services: ChatAIServices, transaction: ChatTransaction) {
  try {
    const result = await processChatTurn(state, input, services);
    const persisted = await transaction.persist(result);
    transaction.commit(result, persisted);
    services.onStatus?.("completed");
    return result;
  } catch (error) {
    services.onStatus?.("error");
    throw error;
  }
}
