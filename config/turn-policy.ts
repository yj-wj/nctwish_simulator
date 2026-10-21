import type { ChoiceTag, OutcomeTag } from "../types/history.ts";
import type { StatId } from "../types/game.ts";
import type { EffectMagnitude, StateEffects } from "../types/state.ts";

export const TURN_POLICY = {
  freeActionMaxLength: 500,
  maxSuggestedEffects: 7,
  maxMemoryCandidates: 4,
  maxMemorySummaryLength: 360,
} as const;

export const allowedTurnStats = [
  "affection",
  "popularity",
  "mood",
  "money",
  "secrecy",
  "companyAlert",
  "careerPressure",
] as const satisfies readonly StatId[];

export const allowedEffectMagnitudes = [
  "large_negative",
  "medium_negative",
  "small_negative",
  "none",
  "small_positive",
  "medium_positive",
  "large_positive",
] as const satisfies readonly EffectMagnitude[];

export const allowedChoiceTags = [
  "self_protection",
  "withdraw",
  "keep_distance",
  "wait",
  "maintain_relationship",
  "temporary_distance",
  "self_growth",
  "study",
  "career",
  "independent_life",
] as const satisfies readonly ChoiceTag[];

export const allowedOutcomeTags = [
  "unstable_response",
  "financial_crisis",
  "career_breakdown",
  "major_exposure",
  "separation_pressure",
  "self_growth",
  "study",
  "career",
  "independent_life",
  "relationship_confirmed",
  "formal_breakup",
  "public_reveal_succeeded",
  "crisis_resolved",
] as const satisfies readonly OutcomeTag[];

export const generatedChoiceDefaults: Record<"A" | "B" | "C", { tags: ChoiceTag[]; effects: StateEffects }> = {
  A: { tags: ["self_protection", "keep_distance"], effects: {} },
  B: { tags: ["maintain_relationship"], effects: {} },
  C: { tags: ["self_growth", "independent_life"], effects: {} },
};

