import { getEventTemplate } from "../config/event-pool.ts";
import {
  allowedChoiceTags,
  allowedEffectMagnitudes,
  allowedOutcomeTags,
  allowedTurnStats,
  TURN_POLICY,
} from "../config/turn-policy.ts";
import { validateActionInterpretationOutput } from "../ai/actionValidator.ts";
import { validateStoryOutput } from "../ai/outputValidator.ts";
import type { AIProviderResult } from "../ai/provider.ts";
import type {
  ActionInterpretationInput,
  ActionInterpretationOutput,
  StoryGenerationInput,
  StoryGenerationOutput,
} from "../ai/schemas.ts";
import type { EventCategory, EventTag } from "../types/event.ts";
import type { ChoiceTag, OutcomeTag, StoryFlagEffect } from "../types/history.ts";
import type { EntityId, MemoryEffect, MemoryImportance } from "../types/memory.ts";
import type { StructuredPlayerAction } from "../types/rules.ts";
import type { EffectMagnitude, StateEffects } from "../types/state.ts";
import type {
  RawSuggestedEffect,
  SanitizedEffects,
  SettlementProposal,
  TurnDomainState,
  TurnPlayerInput,
  TurnResult,
  TurnStatus,
} from "../types/turn.ts";
import { buildActionInterpretationInput, buildStoryGenerationInput } from "./contextBuilder.ts";
import { buildEndingContext } from "./endingContextBuilder.ts";
import { evaluateEndingCandidates } from "./endingEngine.ts";
import { createEventHistoryEntry, runEventEngine } from "./eventEngine.ts";
import { getRelationshipStage } from "./relationship.ts";
import { evaluateAction } from "./ruleEngine.ts";
import { processStructuredSettlement } from "./settlementPipeline.ts";
import { settleChoice } from "./stateEngine.ts";
import { buildEventWorldContext } from "./worldContextBuilder.ts";
import { deriveWorldTriggers, enqueueWorldTriggers } from "./worldEngine.ts";

const allowedStatSet = new Set<string>(allowedTurnStats);
const allowedMagnitudeSet = new Set<string>(allowedEffectMagnitudes);
const allowedChoiceTagSet = new Set<string>(allowedChoiceTags);
const allowedOutcomeTagSet = new Set<string>(allowedOutcomeTags);
const positiveMagnitudes = new Set<EffectMagnitude>(["small_positive", "medium_positive", "large_positive"]);
const negativeMagnitudes = new Set<EffectMagnitude>(["small_negative", "medium_negative", "large_negative"]);

export interface TurnAIServices {
  interpretAction(input: ActionInterpretationInput): Promise<AIProviderResult<ActionInterpretationOutput>>;
  generateStory(input: StoryGenerationInput): Promise<AIProviderResult<StoryGenerationOutput>>;
  onStatus?: (status: TurnStatus) => void;
}

export interface TurnTransaction {
  persist(result: TurnResult): Promise<unknown> | unknown;
  commit(result: TurnResult, persisted: unknown): void;
}

export class TurnEngineError extends Error {
  readonly code: "invalid_action" | "duplicate_turn" | "action_validation" | "story_validation";
  readonly issues: string[];

  constructor(code: TurnEngineError["code"], message: string, issues: string[] = []) {
    super(message);
    this.name = "TurnEngineError";
    this.code = code;
    this.issues = issues;
  }
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function normalizeFreeAction(value: string): string {
  const text = value.trim();
  if (!text) throw new TurnEngineError("invalid_action", "请先写下你想做的行动。");
  if (text.length > TURN_POLICY.freeActionMaxLength) {
    throw new TurnEngineError("invalid_action", `自由行动不能超过 ${TURN_POLICY.freeActionMaxLength} 个字符。`);
  }
  return text;
}

function choiceIdOf(input: TurnPlayerInput): string {
  return input.kind === "preset_choice" ? input.choice.id : `free-${stableHash(input.text.trim())}`;
}

export function createTurnId(state: TurnDomainState, input: TurnPlayerInput): string {
  const eventIdentity = state.selectedEventRecordId
    ?? `${state.gameState.gameId}:${state.gameState.week}:${state.selectedEventId ?? "opening"}`;
  return `turn:${eventIdentity}:${choiceIdOf(input)}`;
}

function actionFromPreset(input: Extract<TurnPlayerInput, { kind: "preset_choice" }>): StructuredPlayerAction {
  const tags = new Set(input.choice.tags);
  const text = input.choice.text;
  const selfGrowth = tags.has("self_growth") || tags.has("study") || tags.has("career") || tags.has("independent_life");
  const confession = /告白|喜欢|爱你/.test(text);
  const intimate = /亲|拥抱|牵手/.test(text);
  return {
    type: confession ? "confession" : selfGrowth ? "selfGrowth" : tags.has("wait") ? "wait" : "politeConversation",
    romanticIntensity: confession ? "high" : tags.has("maintain_relationship") ? "low" : "none",
    physicalIntimacy: intimate ? "light" : "none",
    publicExposure: /公开|镜头|粉丝|机场|人群/.test(text) ? "medium" : "none",
    professionalBoundary: "respected",
  };
}

export function actionFromInterpretation(output: ActionInterpretationOutput): StructuredPlayerAction {
  return {
    type: output.actionType,
    romanticIntensity: output.romanticIntensity,
    physicalIntimacy: output.actionType === "privateIntimacy" ? "intimate" : output.actionType === "flirt" ? "light" : "none",
    publicExposure: output.publicExposure,
    professionalBoundary: output.boundaryRisk === "high" ? "uncertain" : "respected",
  };
}

function effectConflictsWithRules(
  stat: string,
  magnitude: EffectMagnitude,
  action: StructuredPlayerAction,
  rule: ReturnType<typeof evaluateAction>,
): boolean {
  if (magnitude === "none") return false;
  if (
    stat === "affection" &&
    positiveMagnitudes.has(magnitude) &&
    rule.violatedRules.some((id) => id === "relationshipMismatch" || id === "characterBoundaryTriggered")
  ) return true;
  if (stat === "secrecy" && positiveMagnitudes.has(magnitude) && ["medium", "high"].includes(action.publicExposure)) {
    return true;
  }
  if (stat === "companyAlert" && negativeMagnitudes.has(magnitude) && rule.warnings.includes("companyAttentionRisk")) {
    return true;
  }
  return false;
}

export function sanitizeSuggestedEffects(
  rawEffects: RawSuggestedEffect[],
  action: StructuredPlayerAction,
  rule: ReturnType<typeof evaluateAction>,
): SanitizedEffects {
  const effects: StateEffects = {};
  const suggested: SanitizedEffects["suggested"] = [];
  const rejected: SanitizedEffects["rejected"] = [];

  rawEffects.forEach((raw, index) => {
    const stat = typeof raw.stat === "string" ? raw.stat : String(raw.stat ?? "");
    const magnitude = typeof raw.magnitude === "string" ? raw.magnitude : String(raw.magnitude ?? "");
    const reason = typeof raw.reason === "string" && raw.reason.trim() ? raw.reason.trim() : "No reason provided.";
    const trace = { stat, magnitude, reason, source: raw.source ?? "ai" } as const;
    suggested.push(trace);
    if (index >= TURN_POLICY.maxSuggestedEffects) {
      rejected.push({ ...trace, rejectionReason: "too_many_effects" });
      return;
    }
    if (!allowedStatSet.has(stat)) {
      rejected.push({ ...trace, rejectionReason: "invalid_stat" });
      return;
    }
    if (!allowedMagnitudeSet.has(magnitude)) {
      rejected.push({ ...trace, rejectionReason: "invalid_magnitude" });
      return;
    }
    if (effects[stat as keyof StateEffects] !== undefined) {
      rejected.push({ ...trace, rejectionReason: "duplicate_stat" });
      return;
    }
    if (effectConflictsWithRules(stat, magnitude as EffectMagnitude, action, rule)) {
      rejected.push({ ...trace, rejectionReason: "rule_conflict" });
      return;
    }
    effects[stat as keyof StateEffects] = magnitude as EffectMagnitude;
  });
  return { effects, suggested, rejected };
}

export function validateControlledTags<T extends ChoiceTag | OutcomeTag>(
  rawTags: unknown[],
  kind: "choice" | "outcome",
): { accepted: T[]; rejected: string[] } {
  const registry = kind === "choice" ? allowedChoiceTagSet : allowedOutcomeTagSet;
  const accepted: string[] = [];
  const rejected: string[] = [];
  for (const raw of rawTags) {
    const tag = typeof raw === "string" ? raw : String(raw);
    if (!registry.has(tag)) rejected.push(tag);
    else if (!accepted.includes(tag)) accepted.push(tag);
  }
  return { accepted: accepted as T[], rejected };
}

function deriveFlagEffects(
  outcomeTags: OutcomeTag[],
  state: TurnDomainState,
  gameStateAfter: TurnDomainState["gameState"],
  action: StructuredPlayerAction,
  rule: ReturnType<typeof evaluateAction>,
  category: EventCategory,
): StoryFlagEffect[] {
  const tags = new Set(outcomeTags);
  const effects: StoryFlagEffect[] = [];
  const stage = getRelationshipStage(gameStateAfter.stats.affection).id;
  const canConfirm = category === "relationship"
    && ["committed", "inLove", "trial"].includes(stage)
    && ["confession", "defineRelationship"].includes(action.type)
    && !rule.violatedRules.includes("relationshipMismatch");
  if (tags.has("relationship_confirmed") && canConfirm) effects.push({ flag: "relationshipConfirmed", value: true });
  if (tags.has("formal_breakup") && state.storyFlags.relationshipConfirmed && action.type === "breakup") {
    effects.push({ flag: "formalBreakup", value: true });
  }
  if (tags.has("major_exposure")) {
    effects.push({ flag: "majorExposureOccurred", value: true }, { flag: "unresolvedMajorCrisis", value: true });
  }
  if (tags.has("separation_pressure")) {
    effects.push({ flag: "separationPressureActive", value: true }, { flag: "unresolvedMajorCrisis", value: true });
  }
  if (tags.has("financial_crisis") || tags.has("career_breakdown")) {
    effects.push({ flag: "unresolvedMajorCrisis", value: true });
  }
  if (tags.has("public_reveal_succeeded") && stage === "trial" && !rule.violatedRules.includes("publicRelationshipTooEarly")) {
    effects.push({ flag: "publicRevealEventTriggered", value: true }, { flag: "publicRevealSucceeded", value: true });
  }
  if (tags.has("crisis_resolved")) {
    effects.push({ flag: "unresolvedMajorCrisis", value: false }, { flag: "separationPressureActive", value: false });
  }
  return [...new Map(effects.map((effect) => [effect.flag, effect])).values()];
}

function sanitizeMemoryCandidates(
  output: StoryGenerationOutput,
  input: StoryGenerationInput,
  existing: TurnDomainState["memories"],
): Pick<SettlementProposal, "memoryEffects" | "rejectedMemories"> {
  const allowedActors = new Set<EntityId | string>([
    "player",
    input.context.maleLead.id,
    ...input.context.world.relevantNPCs.map(({ id }) => id),
    ...(input.context.world.currentEvent?.actorIds ?? []),
    ...input.context.relevantMemories.flatMap(({ actors }) => actors),
  ]);
  const seen = new Set(existing.map(({ content }) => content.trim().toLocaleLowerCase()));
  const memoryEffects: MemoryEffect[] = [];
  const rejectedMemories: SettlementProposal["rejectedMemories"] = [];
  output.memoryCandidates.forEach((candidate, index) => {
    const summary = candidate.summary.trim();
    let reason = "";
    if (index >= TURN_POLICY.maxMemoryCandidates) reason = "too_many_candidates";
    else if (!summary || summary.length > TURN_POLICY.maxMemorySummaryLength) reason = "invalid_summary";
    else if (candidate.actors.some((actor) => !allowedActors.has(actor))) reason = "unknown_actor";
    else if (candidate.importance < 1 || candidate.importance > 5) reason = "invalid_importance";
    else if (seen.has(summary.toLocaleLowerCase())) reason = "duplicate_memory";
    if (reason) {
      rejectedMemories.push({ index, summary, reason });
      return;
    }
    seen.add(summary.toLocaleLowerCase());
    const actors = [...new Set(candidate.actors)] as EntityId[];
    memoryEffects.push({
      key: `ai-${stableHash(`${candidate.type}:${summary}:${actors.join(",")}`)}`,
      type: candidate.type,
      content: summary,
      actors,
      tags: [...new Set(candidate.tags)],
      importance: candidate.importance as MemoryImportance,
      visibility: actors.includes(input.context.maleLead.id) ? "shared" : "player_known",
      knownBy: [...new Set<EntityId>(["player", ...actors])],
      sourceKind: "outcome",
    });
  });
  return { memoryEffects, rejectedMemories };
}

function presetEffects(input: TurnPlayerInput): RawSuggestedEffect[] {
  if (input.kind !== "preset_choice") return [];
  return Object.entries(input.choice.effects).map(([stat, magnitude]) => ({
    stat,
    magnitude,
    reason: "Preset choice semantic effect.",
    source: "preset" as const,
  }));
}

function totalTokens(...values: Array<number | null | undefined>): number | null {
  const available = values.filter((value): value is number => typeof value === "number");
  return available.length ? available.reduce((sum, value) => sum + value, 0) : null;
}

export async function processTurn(
  state: TurnDomainState,
  rawInput: TurnPlayerInput,
  services: TurnAIServices,
): Promise<TurnResult> {
  const input: TurnPlayerInput = rawInput.kind === "free_action"
    ? { kind: "free_action", text: normalizeFreeAction(rawInput.text) }
    : rawInput;
  const turnId = createTurnId(state, input);
  const settlementId = `${turnId}:settlement`;
  if (state.processedSettlementIds.includes(settlementId)) {
    throw new TurnEngineError("duplicate_turn", "This turn has already been settled.");
  }
  const playerInput = input.kind === "preset_choice" ? input.choice.text : input.text;
  const currentEvent = state.selectedEventId ? getEventTemplate(state.selectedEventId) ?? null : null;
  let interpretation: ActionInterpretationOutput | null = null;
  let actionMetadata: TurnResult["trace"]["actionMetadata"] = null;
  let action: StructuredPlayerAction;

  if (input.kind === "free_action") {
    services.onStatus?.("interpreting");
    const initialContext = buildStoryGenerationInput({
      gameState: state.gameState,
      currentEvent,
      eventHistory: state.eventHistory,
      memories: state.memories,
      storyFlags: state.storyFlags,
      viewerId: "player",
      isNewGameFirstTurn: false,
      recentStoryOpenings: state.recentStoryOpenings,
      worldState: state.worldState,
      chatTurns: state.chatTurns,
      snsPosts: state.snsPosts,
      snsTriggers: state.snsTriggers,
      playerAction: { type: "free_action", text: playerInput },
    });
    const actionInput = buildActionInterpretationInput(initialContext, playerInput);
    const interpreted = await services.interpretAction(actionInput);
    const validated = validateActionInterpretationOutput(interpreted.data, actionInput);
    if (!validated.success) throw new TurnEngineError("action_validation", validated.message, validated.issues);
    interpretation = validated.data;
    actionMetadata = interpreted.metadata;
    action = actionFromInterpretation(validated.data);
  } else {
    action = actionFromPreset(input);
  }

  const ruleEvaluation = evaluateAction(state.gameState, action);
  const storyInput = buildStoryGenerationInput({
    gameState: state.gameState,
    currentEvent,
    eventHistory: state.eventHistory,
    memories: state.memories,
    storyFlags: state.storyFlags,
    viewerId: "player",
    ruleEvaluation,
    isNewGameFirstTurn: false,
    recentStoryOpenings: state.recentStoryOpenings,
    worldState: state.worldState,
    chatTurns: state.chatTurns,
    snsPosts: state.snsPosts,
    snsTriggers: state.snsTriggers,
    playerAction: { type: input.kind === "free_action" ? "free_action" : "choice", text: playerInput },
  });
  services.onStatus?.("generating");
  const generated = await services.generateStory(storyInput);
  services.onStatus?.("validating");
  const storyValidation = validateStoryOutput(generated.data, storyInput);
  if (!storyValidation.success) {
    throw new TurnEngineError("story_validation", storyValidation.message, storyValidation.issues);
  }
  const story = storyValidation.data;
  const aiEffects: RawSuggestedEffect[] = story.suggestedEffects.map((effect) => ({ ...effect, source: "ai" }));
  const sanitized = sanitizeSuggestedEffects([...presetEffects(input), ...aiEffects], action, ruleEvaluation);
  const choiceTags = validateControlledTags<ChoiceTag>([
    ...(input.kind === "preset_choice" ? input.choice.tags : interpretation?.semanticTags ?? []),
    ...story.suggestedChoiceTags,
  ], "choice");
  const outcomeTags = validateControlledTags<OutcomeTag>(story.suggestedOutcomeTags, "outcome");

  services.onStatus?.("settling");
  const choiceId = choiceIdOf(input);
  const transition = settleChoice(state.gameState, sanitized.effects, {
    eventId: currentEvent?.id ?? state.selectedEventId ?? "opening",
    choiceId,
    ruleEvaluation,
  });
  const eventCategory = currentEvent?.category ?? "daily";
  const eventTags = currentEvent?.tags ?? (["daily-life"] satisfies EventTag[]);
  const flagEffects = deriveFlagEffects(
    outcomeTags.accepted,
    state,
    transition.gameState,
    action,
    ruleEvaluation,
    eventCategory,
  );
  const memory = sanitizeMemoryCandidates(story, storyInput, state.memories);
  const proposal: SettlementProposal = {
    suggestedEffects: sanitized.suggested,
    acceptedEffects: sanitized.effects,
    rejectedEffects: sanitized.rejected,
    acceptedChoiceTags: choiceTags.accepted,
    rejectedChoiceTags: choiceTags.rejected,
    acceptedOutcomeTags: outcomeTags.accepted,
    rejectedOutcomeTags: outcomeTags.rejected,
    flagEffects,
    memoryEffects: memory.memoryEffects,
    rejectedMemories: memory.rejectedMemories,
  };
  const eventRecordId = state.selectedEventRecordId
    ?? `${state.gameState.gameId}:${state.gameState.week}:${currentEvent?.id ?? "opening"}:turn`;
  const crisisIsActive = outcomeTags.accepted.some((tag) =>
    ["financial_crisis", "career_breakdown", "major_exposure", "separation_pressure"].includes(tag));
  const structured = processStructuredSettlement({
    weeklyHistory: state.weeklyHistory,
    choiceHistory: state.choiceHistory,
    eventHistory: state.eventHistory,
    storyFlags: state.storyFlags,
    processedSettlementIds: state.processedSettlementIds,
    memories: state.memories,
  }, transition.gameState, {
    settlementId,
    week: state.gameState.week,
    event: {
      recordId: eventRecordId,
      eventId: currentEvent?.id ?? state.selectedEventId ?? "opening",
      category: eventCategory,
      eventTags,
    },
    choice: {
      choiceId,
      choiceText: playerInput,
      choiceTags: choiceTags.accepted,
      isImportantRelationshipEvent: eventCategory === "relationship",
    },
    beforeState: transition.changeLog.before,
    afterState: transition.changeLog.after,
    relationshipStageBefore: transition.changeLog.relationshipStageBefore,
    relationshipStageAfter: transition.changeLog.relationshipStageAfter,
    outcome: {
      outcomeTags: outcomeTags.accepted,
      flagEffects,
      eventStatus: outcomeTags.accepted.includes("crisis_resolved") ? "resolved" : crisisIsActive ? "active" : "resolved",
      memoryEffects: memory.memoryEffects,
    },
  });
  const eventWorldState = enqueueWorldTriggers(state.worldState, deriveWorldTriggers({
    gameId: transition.gameState.gameId, week: transition.gameState.week, source: "story", sourceId: turnId,
    eventId: currentEvent?.id, eventCategory, eventTags,
    outcomeTags: outcomeTags.accepted, choiceTags: choiceTags.accepted,
    actorIds: currentEvent?.actorIds ?? ["player", transition.gameState.maleLead],
    publicSummary: currentEvent?.description,
  }));
  const eventEngineResult = runEventEngine(transition.gameState, {
    history: structured.eventHistory,
    seed: state.eventSeed,
    world: buildEventWorldContext({
      gameState: transition.gameState,
      worldState: eventWorldState,
      storyFlags: structured.storyFlags,
      eventHistory: structured.eventHistory,
      memories: structured.memories,
      chatTurns: state.chatTurns,
      snsPosts: state.snsPosts,
      snsTriggers: state.snsTriggers,
    }),
  });
  const selectedEvent = eventEngineResult.selectedEvent?.event ?? null;
  const selectedRecord = selectedEvent
    ? createEventHistoryEntry(selectedEvent, transition.gameState, structured.eventHistory.length)
    : null;
  const eventHistory = selectedRecord ? [...structured.eventHistory, selectedRecord] : structured.eventHistory;
  const endingContext = buildEndingContext(
    transition.gameState,
    structured.weeklyHistory,
    structured.choiceHistory,
    eventHistory,
    structured.storyFlags,
  );
  const endings = evaluateEndingCandidates(transition.gameState, endingContext).candidates;
  const tokenTotal = totalTokens(actionMetadata?.usage.totalTokens, generated.metadata.usage.totalTokens);
  const totalLatencyMs = (actionMetadata?.latencyMs ?? 0) + generated.metadata.latencyMs;

  return {
    turnId,
    settlementId,
    gameState: transition.gameState,
    eventHistory,
    choiceHistory: structured.choiceHistory,
    weeklyHistory: structured.weeklyHistory,
    storyFlags: structured.storyFlags,
    memories: structured.memories,
    processedSettlementIds: structured.processedSettlementIds,
    stateChangeLog: transition.changeLog,
    eventEngineResult,
    selectedEventId: selectedEvent?.id ?? null,
    selectedEventRecordId: selectedRecord?.recordId ?? null,
    eventSeed: state.eventSeed + 1,
    story,
    trace: {
      turnId,
      settlementId,
      inputKind: input.kind,
      playerInput,
      actionInterpretation: interpretation,
      structuredAction: action,
      ruleEvaluation,
      storyContext: storyInput,
      storyOutput: story,
      settlementProposal: proposal,
      beforeState: state.gameState,
      afterState: transition.gameState,
      relationshipStageBefore: transition.changeLog.relationshipStageBefore,
      relationshipStageAfter: transition.changeLog.relationshipStageAfter,
      endingCandidates: endings,
      actionMetadata,
      storyMetadata: generated.metadata,
      totalTokens: tokenTotal,
      totalLatencyMs,
    },
  };
}

export async function executeTurnTransaction(
  state: TurnDomainState,
  input: TurnPlayerInput,
  services: TurnAIServices,
  transaction: TurnTransaction,
): Promise<TurnResult> {
  try {
    const result = await processTurn(state, input, services);
    const persisted = await transaction.persist(result);
    transaction.commit(result, persisted);
    services.onStatus?.("completed");
    return result;
  } catch (error) {
    services.onStatus?.("error");
    throw error;
  }
}

