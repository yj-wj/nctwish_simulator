import type { EventHistoryEntry } from "../types/event.ts";
import type { GameState } from "../types/game.ts";
import type {
  ChoiceHistoryRecord,
  ChoiceTag,
  HistoryMetrics,
  HistorySettlementInput,
  OutcomeTag,
  StoryFlagEffect,
  StoryFlagState,
  WeeklyStateSnapshot,
} from "../types/history.ts";
import { getRelationshipStage } from "./relationship.ts";

const selfGrowthTags = new Set<ChoiceTag | OutcomeTag>([
  "self_growth",
  "study",
  "career",
  "independent_life",
]);
const selfProtectionTags = new Set<ChoiceTag>([
  "self_protection",
  "withdraw",
  "keep_distance",
]);

export function getRecentWeeklySnapshots(
  history: WeeklyStateSnapshot[],
  count: number,
): WeeklyStateSnapshot[] {
  if (count <= 0) return [];
  return [...history].sort((left, right) => left.week - right.week).slice(-count);
}

export function recordWeeklySnapshot(
  history: WeeklyStateSnapshot[],
  gameState: GameState,
  settlementId: string,
): WeeklyStateSnapshot[] {
  const snapshot: WeeklyStateSnapshot = {
    id: `${gameState.gameId}:week:${gameState.week}`,
    week: gameState.week,
    ...gameState.stats,
    relationshipStage: getRelationshipStage(gameState.stats.affection).id,
    settlementId,
  };
  const existing = history.find(({ week }) => week === gameState.week);
  if (existing?.settlementId === settlementId) return history;
  if (existing) {
    return history.map((entry) => entry.week === gameState.week ? snapshot : entry);
  }
  return [...history, snapshot].sort((left, right) => left.week - right.week);
}

export function recordChoiceHistory(
  history: ChoiceHistoryRecord[],
  record: ChoiceHistoryRecord,
): ChoiceHistoryRecord[] {
  if (history.some(({ id, settlementId }) => id === record.id || settlementId === record.settlementId)) {
    return history;
  }
  return [...history, record];
}

export function applyStoryFlagEffects(
  current: StoryFlagState,
  effects: StoryFlagEffect[],
): StoryFlagState {
  return effects.reduce<StoryFlagState>(
    (next, effect) => ({ ...next, [effect.flag]: effect.value }),
    current,
  );
}

export function settleEventHistory(
  history: EventHistoryEntry[],
  input: HistorySettlementInput,
): EventHistoryEntry[] {
  const existingIndex = history.findIndex(({ recordId }) => recordId === input.event.recordId);
  const existing = existingIndex >= 0 ? history[existingIndex] : undefined;
  const settled: EventHistoryEntry = {
    recordId: input.event.recordId,
    eventId: input.event.eventId,
    week: input.week,
    category: input.event.category,
    eventTags: [...new Set([...(existing?.eventTags ?? []), ...input.event.eventTags])],
    outcomeTags: [...new Set([...(existing?.outcomeTags ?? []), ...input.outcome.outcomeTags])],
    status: input.outcome.eventStatus,
    settlementId: input.settlementId,
    flagEffects: [...(existing?.flagEffects ?? []), ...input.outcome.flagEffects],
  };
  if (existingIndex < 0) return [...history, settled];
  return history.map((entry, index) => index === existingIndex ? settled : entry);
}

export interface HistoryPipelineState {
  weeklyHistory: WeeklyStateSnapshot[];
  choiceHistory: ChoiceHistoryRecord[];
  eventHistory: EventHistoryEntry[];
  storyFlags: StoryFlagState;
  processedSettlementIds: string[];
}

export function processHistorySettlement(
  current: HistoryPipelineState,
  gameStateAfter: GameState,
  input: HistorySettlementInput,
): HistoryPipelineState {
  if (current.processedSettlementIds.includes(input.settlementId)) return current;
  const choiceRecord: ChoiceHistoryRecord = {
    id: input.settlementId,
    settlementId: input.settlementId,
    week: input.week,
    eventId: input.event.eventId,
    choiceId: input.choice.choiceId,
    choiceText: input.choice.choiceText,
    choiceTags: [...input.choice.choiceTags],
    isImportantRelationshipEvent: input.choice.isImportantRelationshipEvent,
    beforeState: { ...input.beforeState },
    afterState: { ...input.afterState },
    relationshipStageBefore: input.relationshipStageBefore,
    relationshipStageAfter: input.relationshipStageAfter,
  };
  return {
    weeklyHistory: recordWeeklySnapshot(current.weeklyHistory, gameStateAfter, input.settlementId),
    choiceHistory: recordChoiceHistory(current.choiceHistory, choiceRecord),
    eventHistory: settleEventHistory(current.eventHistory, input),
    storyFlags: applyStoryFlagEffects(current.storyFlags, input.outcome.flagEffects),
    processedSettlementIds: [...current.processedSettlementIds, input.settlementId],
  };
}

export function deriveHistoryMetrics(
  currentWeek: number,
  weeklyHistory: WeeklyStateSnapshot[],
  choiceHistory: ChoiceHistoryRecord[],
  eventHistory: EventHistoryEntry[],
): HistoryMetrics {
  const firstGrowthWeek = currentWeek - 7;
  const growthSettlements = new Set<string>();
  for (const choice of choiceHistory) {
    if (
      choice.week >= firstGrowthWeek &&
      choice.week <= currentWeek &&
      choice.choiceTags.some((tag) => selfGrowthTags.has(tag))
    ) growthSettlements.add(choice.settlementId);
  }
  for (const event of eventHistory) {
    if (
      event.week >= firstGrowthWeek &&
      event.week <= currentWeek &&
      event.outcomeTags.some((tag) => selfGrowthTags.has(tag))
    ) growthSettlements.add(event.settlementId ?? event.recordId);
  }

  const selfProtectionChoiceCount = choiceHistory.filter((choice) =>
    choice.isImportantRelationshipEvent &&
    choice.choiceTags.some((tag) => selfProtectionTags.has(tag))).length;
  const unstableSettlements = new Set(eventHistory
    .filter(({ outcomeTags }) => outcomeTags.includes("unstable_response"))
    .map(({ settlementId, recordId }) => settlementId ?? recordId));
  const lowMoodWeeksInLast5 = getRecentWeeklySnapshots(weeklyHistory, 5)
    .filter(({ mood }) => mood < 30).length;

  return {
    selfGrowthEventsInLast8Weeks: growthSettlements.size,
    selfProtectionChoiceCount,
    unstableResponseCount: unstableSettlements.size,
    lowMoodWeeksInLast5,
  };
}
