import {
  endingDefinitions,
  endingDerivedConditionConfig,
  endingProgressConfig,
  initialEndingHistoryMetrics,
  initialEndingStoryFlags,
} from "../config/endings.ts";
import type {
  EndingCandidate,
  EndingCondition,
  EndingConditionOperator,
  EndingContext,
  EndingDerivedConditions,
  EndingEvaluation,
  EndingEvaluationContext,
} from "../types/ending.ts";
import type { GameState } from "../types/game.ts";

function compare(current: number, operator: EndingConditionOperator, expected: number): boolean {
  switch (operator) {
    case "greaterThanOrEqual": return current >= expected;
    case "lessThan": return current < expected;
    case "greaterThan": return current > expected;
    case "lessThanOrEqual": return current <= expected;
    case "equal": return current === expected;
  }
}

export function resolveEndingContext(context: EndingEvaluationContext = {}): EndingContext {
  return {
    historyMetrics: { ...initialEndingHistoryMetrics, ...context.historyMetrics },
    storyFlags: { ...initialEndingStoryFlags, ...context.storyFlags },
  };
}

export function getEndingDerivedConditions(
  gameState: GameState,
  context: EndingEvaluationContext = {},
): EndingDerivedConditions {
  const resolved = resolveEndingContext(context);
  const { historyMetrics, storyFlags } = resolved;
  return {
    playerLifeStable:
      gameState.stats.money >= endingDerivedConditionConfig.playerLifeStable.moneyMin &&
      gameState.stats.mood >= endingDerivedConditionConfig.playerLifeStable.moodMin &&
      historyMetrics.selfGrowthEventCount >= endingDerivedConditionConfig.playerLifeStable.selfGrowthEventCountMin &&
      !storyFlags.unresolvedFinancialCrisis,
    stillInLove:
      gameState.stats.affection >= endingDerivedConditionConfig.stillInLove.affectionMin &&
      storyFlags.relationshipConfirmed &&
      !storyFlags.formalBreakup,
    maleLeadCareerStable:
      gameState.stats.careerPressure <= endingDerivedConditionConfig.maleLeadCareerStable.careerPressureMax &&
      !storyFlags.unresolvedCareerBreakdownInLast4Weeks,
  };
}

function matchesCondition(
  condition: EndingCondition,
  gameState: GameState,
  context: EndingContext,
  derivedConditions: EndingDerivedConditions,
): boolean {
  switch (condition.source) {
    case "stat":
      return compare(gameState.stats[condition.key], condition.operator, condition.value);
    case "history":
      return compare(context.historyMetrics[condition.key], condition.operator, condition.value);
    case "storyFlag":
      return context.storyFlags[condition.key] === condition.expected;
    case "derived":
      return derivedConditions[condition.key] === condition.expected;
  }
}

export function getEndingProgressEligibility(
  gameState: GameState,
): Pick<EndingEvaluation, "progressEligible" | "progressReason"> {
  if ((endingProgressConfig.weekCheckpoints as readonly number[]).includes(gameState.week)) {
    return { progressEligible: true, progressReason: "weekCheckpoint" };
  }
  if (gameState.stats.affection >= endingProgressConfig.affectionThreshold) {
    return { progressEligible: true, progressReason: "affectionThreshold" };
  }
  return { progressEligible: false, progressReason: "notEligible" };
}

export function evaluateEndingCandidates(
  gameState: GameState,
  evaluationContext: EndingEvaluationContext = {},
): EndingEvaluation {
  const progress = getEndingProgressEligibility(gameState);
  const context = resolveEndingContext(evaluationContext);
  const derivedConditions = getEndingDerivedConditions(gameState, context);
  if (!progress.progressEligible) return { ...progress, derivedConditions, candidates: [] };

  const candidates: EndingCandidate[] = endingDefinitions.flatMap((definition) => {
    const allOfMatches = definition.allOf.every((condition) =>
      matchesCondition(condition, gameState, context, derivedConditions));
    const anyOfMatches = !definition.anyOf || definition.anyOf.some((condition) =>
      matchesCondition(condition, gameState, context, derivedConditions));
    if (!allOfMatches || !anyOfMatches) return [];
    return [{
      id: definition.id,
      type: definition.type,
      title: definition.title,
      matchedConditions: [
        ...definition.allOf,
        ...(definition.anyOf?.filter((condition) =>
          matchesCondition(condition, gameState, context, derivedConditions)) ?? []),
      ],
    }];
  });

  return { ...progress, derivedConditions, candidates };
}

export function getEndingCandidates(
  gameState: GameState,
  context: EndingEvaluationContext = {},
): EndingCandidate[] {
  return evaluateEndingCandidates(gameState, context).candidates;
}
