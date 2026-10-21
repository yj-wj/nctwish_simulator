import { eventPool } from "../config/event-pool.ts";
import {
  careerStageTagWeights,
  eventWeightPolicy,
  gameModeEventWeights,
  relationshipStageEventWeights,
  triggerCategoryEventWeights,
} from "../config/event-weight-modifiers.ts";
import type {
  EventEngineContext,
  EventEngineResult,
  EventEligibilityResult,
  EventFilterReason,
  EventHistoryEntry,
  EventTemplate,
  EventWeightBreakdown,
  FilteredEvent,
  WeightedEventCandidate,
} from "../types/event.ts";
import type { GameState } from "../types/game.ts";
import type { RuleEvaluation, SpecialTriggerMatch } from "../types/rules.ts";
import { getRelationshipStage } from "./relationship.ts";
import { getMatchedTriggers } from "./ruleEngine.ts";

type TriggerRuleContext = Pick<RuleEvaluation, "matchedTriggers">;

function includesAny<T>(haystack: T[] | undefined, needles: Set<T>): boolean {
  return haystack?.some((value) => needles.has(value)) ?? false;
}

function getFilterReasons(
  event: EventTemplate,
  gameState: GameState,
  matchedTriggers: SpecialTriggerMatch[],
  history: EventHistoryEntry[],
): EventFilterReason[] {
  const reasons: EventFilterReason[] = [];
  const stage = getRelationshipStage(gameState.stats.affection);
  const triggerIds = new Set(matchedTriggers.map(({ id }) => id));

  if (event.relationshipStages && !event.relationshipStages.includes(stage.id)) {
    reasons.push({ code: "relationshipStage", detail: `当前关系阶段 ${stage.name} 不在事件允许范围内。` });
  }
  if (event.careerStages && !event.careerStages.includes(gameState.careerStage)) {
    reasons.push({ code: "careerStage", detail: `当前事业阶段 ${gameState.careerStage} 不匹配。` });
  }
  if (event.gameModes && !event.gameModes.includes(gameState.gameMode)) {
    reasons.push({ code: "gameMode", detail: `当前剧情模式 ${gameState.gameMode} 不匹配。` });
  }
  if (event.requirements?.minWeek !== undefined && gameState.week < event.requirements.minWeek) {
    reasons.push({ code: "week", detail: `需要第 ${event.requirements.minWeek} 周或之后。` });
  }
  if (event.requirements?.maxWeek !== undefined && gameState.week > event.requirements.maxWeek) {
    reasons.push({ code: "week", detail: `仅允许在第 ${event.requirements.maxWeek} 周或之前。` });
  }
  const missingTriggers = event.requiredTriggers?.filter((trigger) => !triggerIds.has(trigger)) ?? [];
  if (missingTriggers.length > 0) {
    reasons.push({ code: "missingTrigger", detail: `缺少触发条件：${missingTriggers.join(", ")}。` });
  }

  const exclusions = event.exclusions;
  if (
    exclusions?.relationshipStages?.includes(stage.id) ||
    exclusions?.careerStages?.includes(gameState.careerStage) ||
    exclusions?.gameModes?.includes(gameState.gameMode) ||
    includesAny(exclusions?.matchedTriggers, triggerIds)
  ) {
    reasons.push({ code: "excludedByState", detail: "当前状态命中事件排除条件。" });
  }

  const appearances = history.filter(({ eventId }) => eventId === event.id);
  if (event.oncePerSave && appearances.length > 0) {
    reasons.push({ code: "oncePerSave", detail: "该事件在当前存档中只能出现一次。" });
  } else if (event.cooldown !== undefined && appearances.length > 0) {
    const lastWeek = Math.max(...appearances.map(({ week }) => week));
    if (gameState.week - lastWeek <= event.cooldown) {
      reasons.push({ code: "cooldown", detail: `事件冷却 ${event.cooldown} 周，最近发生于第 ${lastWeek} 周。` });
    }
  }
  return reasons;
}

export function getEligibleEvents(
  gameState: GameState,
  context: EventEngineContext = {},
  templates: EventTemplate[] = eventPool,
): EventEligibilityResult {
  const history = context.history ?? [];
  const matchedTriggers = context.matchedTriggers ?? getMatchedTriggers(gameState);
  const eligibleEvents: EventTemplate[] = [];
  const filteredEvents: FilteredEvent[] = [];

  for (const event of templates) {
    const reasons = getFilterReasons(event, gameState, matchedTriggers, history);
    if (reasons.length === 0) eligibleEvents.push(event);
    else filteredEvents.push({ event, reasons });
  }
  return { matchedTriggers, eligibleEvents, filteredEvents };
}

function getTriggerModifier(event: EventTemplate, matchedTriggers: SpecialTriggerMatch[]): number {
  const categoryModifiers = matchedTriggers.map(
    ({ id }) => triggerCategoryEventWeights[id][event.category] ?? 1,
  );
  const categoryModifier = Math.max(1, ...categoryModifiers);
  const requiredTriggerMatch = event.requiredTriggers?.length
    ? eventWeightPolicy.requiredTriggerMatch
    : 1;
  return categoryModifier * requiredTriggerMatch;
}

function getCareerStageModifier(event: EventTemplate, gameState: GameState): number {
  const configuredTagWeights = careerStageTagWeights[gameState.careerStage];
  const tagModifier = Math.max(1, ...event.tags.map((tag) => configuredTagWeights[tag] ?? 1));
  const explicitStageModifier = event.careerStages?.includes(gameState.careerStage)
    ? eventWeightPolicy.explicitlyMatchedCareerStage
    : 1;
  return Math.max(tagModifier, explicitStageModifier);
}

export function calculateEventWeight(
  event: EventTemplate,
  gameState: GameState,
  ruleEvaluation: TriggerRuleContext,
  history: EventHistoryEntry[] = [],
  recentWindow: number = eventWeightPolicy.recentWindow,
): EventWeightBreakdown {
  const stage = getRelationshipStage(gameState.stats.affection);
  const gameModeModifier = gameModeEventWeights[gameState.gameMode][event.category];
  const relationshipModifier = relationshipStageEventWeights[stage.id][event.category];
  const triggerModifier = getTriggerModifier(event, ruleEvaluation.matchedTriggers);
  const careerStageModifier = getCareerStageModifier(event, gameState);
  const appearedRecently = history
    .slice(-Math.max(0, recentWindow))
    .some(({ eventId }) => eventId === event.id);
  const recentEventPenalty = appearedRecently ? eventWeightPolicy.recentEventPenalty : 1;
  const rawWeight = event.baseWeight
    * gameModeModifier
    * relationshipModifier
    * triggerModifier
    * careerStageModifier
    * recentEventPenalty;

  return {
    baseWeight: event.baseWeight,
    gameModeModifier,
    relationshipModifier,
    triggerModifier,
    careerStageModifier,
    recentEventPenalty,
    finalWeight: Number(Math.max(0, rawWeight).toFixed(4)),
  };
}

function hashSeed(seed: number | string): number {
  if (typeof seed === "number") return seed >>> 0;
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnit(seed: number | string): number {
  let value = hashSeed(seed) + 0x6d2b79f5;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

export function selectNextEvent(
  candidates: WeightedEventCandidate[],
  seed: number | string = 0,
): WeightedEventCandidate | null {
  const selectable = candidates.filter(({ weight }) => weight.finalWeight > 0);
  const totalWeight = selectable.reduce((sum, { weight }) => sum + weight.finalWeight, 0);
  if (totalWeight <= 0) return null;
  let cursor = seededUnit(seed) * totalWeight;
  for (const candidate of selectable) {
    cursor -= candidate.weight.finalWeight;
    if (cursor < 0) return candidate;
  }
  return selectable.at(-1) ?? null;
}

export function runEventEngine(
  gameState: GameState,
  context: EventEngineContext = {},
  templates: EventTemplate[] = eventPool,
): EventEngineResult {
  const history = context.history ?? [];
  const eligibility = getEligibleEvents(gameState, context, templates);
  const ruleContext = { matchedTriggers: eligibility.matchedTriggers };
  const eligibleEvents = eligibility.eligibleEvents.map((event) => ({
    event,
    weight: calculateEventWeight(event, gameState, ruleContext, history, context.recentWindow),
  }));
  const seed = context.seed ?? `${gameState.gameId}:${gameState.week}:${history.length}`;
  return {
    matchedTriggers: eligibility.matchedTriggers,
    eligibleEvents,
    filteredEvents: eligibility.filteredEvents,
    selectedEvent: selectNextEvent(eligibleEvents, seed),
  };
}

export function createEventHistoryEntry(
  event: EventTemplate,
  gameState: GameState,
  sequence = 0,
): EventHistoryEntry {
  return {
    recordId: `${gameState.gameId}:${gameState.week}:${event.id}:selection:${sequence}`,
    eventId: event.id,
    week: gameState.week,
    category: event.category,
    eventTags: [...event.tags],
    outcomeTags: [],
    status: "selected",
    flagEffects: [],
  };
}
