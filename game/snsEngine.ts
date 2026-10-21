import type { AIProviderResult } from "../ai/provider.ts";
import type { SNSGenerationInput, SNSGenerationOutput } from "../ai/snsSchemas.ts";
import { SNS_LEVEL_EFFECTS, SNS_LEVEL_ORDER, SNS_REASON_POLICY } from "../config/sns.ts";
import type { EventTag } from "../types/event";
import type { StoryFlagEffect } from "../types/history";
import type { MemoryEffect } from "../types/memory";
import type { StructuredPlayerAction } from "../types/rules";
import type { SNSDomainState, SNSGenerationStatus, SNSGenerationTrigger, SNSPost, SNSPostRejection, SNSTurnResult } from "../types/sns";
import { applyStoryFlagEffects, recordWeeklySnapshot, settleEventHistory } from "./historyEngine.ts";
import { addMemories } from "./memoryEngine.ts";
import { evaluateAction } from "./ruleEngine.ts";
import { buildSNSContext } from "./snsContextBuilder.ts";
import { settleChoice } from "./stateEngine.ts";

export interface SNSAIServices {
  generateSNS(input: SNSGenerationInput): Promise<AIProviderResult<SNSGenerationOutput>>;
  onStatus?: (status: SNSGenerationStatus) => void;
  now?: () => Date;
}

export interface SNSTransaction {
  persist(result: SNSTurnResult): Promise<unknown> | unknown;
  commit(result: SNSTurnResult, persisted: unknown): void;
}

export class SNSEngineError extends Error {
  readonly code: "duplicate_trigger" | "no_accepted_posts";
  constructor(code: "duplicate_trigger" | "no_accepted_posts", message: string) { super(message); this.code = code; this.name = "SNSEngineError"; }
}

function ruleAction(trigger: SNSGenerationTrigger): StructuredPlayerAction {
  return {
    type: "other", romanticIntensity: "none", physicalIntimacy: "none",
    publicExposure: SNS_LEVEL_ORDER[trigger.level] >= SNS_LEVEL_ORDER.controversy ? "high" : SNS_LEVEL_ORDER[trigger.level] >= SNS_LEVEL_ORDER.rumor ? "medium" : "low",
    professionalBoundary: "respected",
  };
}

function flagEffects(trigger: SNSGenerationTrigger): StoryFlagEffect[] {
  if (trigger.level !== "crisis") return [];
  return [
    { flag: "majorExposureOccurred", value: true },
    { flag: "publicOpinionOutOfControl", value: true },
    { flag: "unresolvedMajorCrisis", value: true },
  ];
}

function memoryEffect(trigger: SNSGenerationTrigger, maleLead: SNSDomainState["gameState"]["maleLead"]): MemoryEffect[] {
  if (SNS_LEVEL_ORDER[trigger.level] < SNS_LEVEL_ORDER.rumor) return [];
  return [{
    key: `sns-${trigger.id}`,
    type: trigger.level === "crisis" ? "long_term" : "short_term",
    content: `公开舆论“${trigger.publicTitle}”已达到${trigger.level}层级：${trigger.publicSummary}`,
    actors: ["player", maleLead], tags: ["sns", "public-opinion", trigger.reason],
    importance: trigger.level === "crisis" ? 5 : trigger.level === "controversy" ? 4 : 3,
    visibility: "shared", knownBy: ["player", maleLead], sourceKind: "outcome",
  }];
}

function sanitizePosts(output: SNSGenerationOutput, state: SNSDomainState, trigger: SNSGenerationTrigger) {
  const policy = SNS_REASON_POLICY[trigger.reason];
  const seen = new Set(state.snsPosts.map(({ content }) => content.trim().toLocaleLowerCase()));
  const accepted: SNSGenerationOutput["posts"] = [];
  const rejected: SNSPostRejection[] = [];
  output.posts.forEach((post, index) => {
    const normalized = post.content.trim().toLocaleLowerCase();
    const reason = !policy.allowedAccounts.includes(post.accountType)
      ? "account_policy_mismatch"
      : trigger.reason === "company_statement" && post.visibility !== "public"
        ? "visibility_policy_mismatch"
        : seen.has(normalized) ? "duplicate_content" : null;
    if (reason) { rejected.push({ index, reason, content: post.content }); return; }
    seen.add(normalized);
    accepted.push(post);
  });
  return { accepted, rejected };
}

function reactions(level: SNSGenerationTrigger["level"], popularity: number, index: number) {
  const base = 20 + popularity * 4 + SNS_LEVEL_ORDER[level] * 180 + index * 17;
  return { likes: base, reposts: Math.round(base * 0.28), comments: Math.round(base * 0.16), heat: Math.round(base * (1 + SNS_LEVEL_ORDER[level] * 0.25)) };
}

export async function processSNSTrigger(state: SNSDomainState, trigger: SNSGenerationTrigger, services: SNSAIServices): Promise<SNSTurnResult> {
  const settlementId = `${trigger.id}:settlement`;
  if (state.processedSettlementIds.includes(settlementId) || state.snsTriggers.find(({ id }) => id === trigger.id)?.status === "delivered") {
    throw new SNSEngineError("duplicate_trigger", "This SNS trigger has already been processed.");
  }
  const ruleEvaluation = evaluateAction(state.gameState, ruleAction(trigger));
  const context = buildSNSContext(state, trigger);
  services.onStatus?.("generating");
  const generated = await services.generateSNS(context);
  services.onStatus?.("validating");
  const posts = sanitizePosts(generated.data, state, trigger);
  if (!posts.accepted.length) throw new SNSEngineError("no_accepted_posts", "SNS generator produced no policy-compatible posts.");
  services.onStatus?.("settling");
  const appliedEffects = SNS_LEVEL_EFFECTS[trigger.level];
  const transition = settleChoice(state.gameState, appliedEffects, { eventId: `sns:${trigger.reason}`, choiceId: trigger.id, ruleEvaluation });
  const flags = flagEffects(trigger);
  const eventTags = [...new Set<EventTag>([...SNS_REASON_POLICY[trigger.reason].eventTags, ...trigger.sourceTags])];
  const outcomeTags = trigger.level === "crisis" ? ["major_exposure" as const] : [];
  const eventHistory = settleEventHistory(state.eventHistory, {
    settlementId, week: trigger.week,
    event: { recordId: `${trigger.id}:event`, eventId: `sns:${trigger.reason}`, category: "publicOpinion", eventTags },
    choice: { choiceId: trigger.id, choiceText: "System SNS publication", choiceTags: [], isImportantRelationshipEvent: false },
    beforeState: transition.changeLog.before, afterState: transition.changeLog.after,
    relationshipStageBefore: transition.changeLog.relationshipStageBefore, relationshipStageAfter: transition.changeLog.relationshipStageAfter,
    outcome: { outcomeTags, flagEffects: flags, eventStatus: trigger.level === "controversy" || trigger.level === "crisis" ? "active" : "resolved" },
  });
  const effects = memoryEffect(trigger, state.gameState.maleLead);
  const memories = addMemories(state.memories, effects, {
    gameId: state.gameState.gameId, week: trigger.week, maleLeadId: state.gameState.maleLead,
    eventId: `sns:${trigger.reason}`, choiceId: trigger.id, settlementId,
  });
  const now = (services.now ?? (() => new Date()))().toISOString();
  let sequence = state.snsPosts.reduce((max, post) => Math.max(max, post.sequence), 0);
  const addedPosts: SNSPost[] = posts.accepted.map((post, index) => ({
    id: `${trigger.id}:post:${index + 1}`, authorId: post.authorId, authorName: post.authorName,
    handle: post.handle, accountType: post.accountType, content: post.content, week: trigger.week,
    sequence: ++sequence, tags: post.topicTags, visibility: post.visibility, sentiment: post.sentiment,
    reactions: reactions(trigger.level, transition.gameState.stats.popularity, index), sourceTriggerId: trigger.id,
    sourceEventId: trigger.sourceEventId, sourceTurnId: trigger.sourceTurnId, read: false, createdAt: now,
  }));
  const snsTriggers = state.snsTriggers.map((item) => item.id === trigger.id ? { ...item, status: "delivered" as const } : item);
  return {
    settlementId, gameState: transition.gameState, eventHistory, choiceHistory: state.choiceHistory,
    weeklyHistory: recordWeeklySnapshot(state.weeklyHistory, transition.gameState, settlementId),
    storyFlags: applyStoryFlagEffects(state.storyFlags, flags), memories,
    processedSettlementIds: [...state.processedSettlementIds, settlementId],
    snsPosts: [...state.snsPosts, ...addedPosts], snsTriggers, stateChangeLog: transition.changeLog,
    trace: {
      trigger, ruleEvaluation, context, output: generated.data, acceptedPostCount: addedPosts.length,
      rejectedPosts: posts.rejected, appliedEffects, beforeState: state.gameState, afterState: transition.gameState,
      memoryWritten: effects.length > 0, metadata: generated.metadata,
    },
  };
}

export async function executeSNSTransaction(state: SNSDomainState, trigger: SNSGenerationTrigger, services: SNSAIServices, transaction: SNSTransaction) {
  try {
    const result = await processSNSTrigger(state, trigger, services);
    const persisted = await transaction.persist(result);
    transaction.commit(result, persisted);
    services.onStatus?.("completed");
    return result;
  } catch (error) {
    services.onStatus?.("error");
    throw error;
  }
}
