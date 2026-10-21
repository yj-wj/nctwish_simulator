import type { EndingContext } from "../types/ending.ts";
import type { EventHistoryEntry } from "../types/event.ts";
import type { GameState } from "../types/game.ts";
import type { ChoiceHistoryRecord, StoryFlagState, WeeklyStateSnapshot } from "../types/history.ts";
import { deriveHistoryMetrics } from "./historyEngine.ts";

export function buildEndingContext(
  gameState: GameState,
  weeklyHistory: WeeklyStateSnapshot[],
  choiceHistory: ChoiceHistoryRecord[],
  eventHistory: EventHistoryEntry[],
  storyFlags: StoryFlagState,
): EndingContext {
  const unresolvedFinancialCrisis = eventHistory.some((event) =>
    event.status === "active" && event.outcomeTags.includes("financial_crisis"));
  const firstCareerWeek = gameState.week - 3;
  const unresolvedCareerBreakdownInLast4Weeks = eventHistory.some((event) =>
    event.status === "active" &&
    event.week >= firstCareerWeek &&
    event.week <= gameState.week &&
    event.outcomeTags.includes("career_breakdown"));
  const waitOrMaintainRelationshipChoiceMade = choiceHistory.some((choice) =>
    choice.choiceTags.some((tag) =>
      tag === "wait" || tag === "maintain_relationship" || tag === "temporary_distance"));

  return {
    historyMetrics: deriveHistoryMetrics(
      gameState.week,
      weeklyHistory,
      choiceHistory,
      eventHistory,
    ),
    storyFlags: { ...storyFlags },
    historyFacts: {
      unresolvedFinancialCrisis,
      unresolvedCareerBreakdownInLast4Weeks,
      waitOrMaintainRelationshipChoiceMade,
    },
  };
}
