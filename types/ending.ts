import type { StatId } from "./game";
import type { HistoryMetrics, StoryFlagId, StoryFlagState } from "./history";

export type EndingType = "HE" | "OE" | "BE" | "SE";

export type EndingId =
  | "HE_SECRET_STABLE"
  | "OE_WAITING"
  | "BE_EXPOSURE"
  | "BE_PLAYER_LEAVES"
  | "SE_PUBLIC_RELATIONSHIP";

export interface EndingHistoryFacts {
  unresolvedFinancialCrisis: boolean;
  waitOrMaintainRelationshipChoiceMade: boolean;
  unresolvedCareerBreakdownInLast4Weeks: boolean;
}

export type EndingHistoryFactId = keyof EndingHistoryFacts;

export interface EndingContext {
  historyMetrics: HistoryMetrics;
  storyFlags: StoryFlagState;
  historyFacts: EndingHistoryFacts;
}

export type EndingDerivedConditionId =
  | "playerLifeStable"
  | "stillInLove"
  | "maleLeadCareerStable";

export type EndingDerivedConditions = Record<EndingDerivedConditionId, boolean>;

export type EndingConditionOperator =
  | "greaterThanOrEqual"
  | "lessThan"
  | "greaterThan"
  | "lessThanOrEqual"
  | "equal";

export interface EndingStatCondition {
  source: "stat";
  key: StatId;
  operator: EndingConditionOperator;
  value: number;
  sourceText: string;
}

export interface EndingHistoryCondition {
  source: "history";
  key: keyof HistoryMetrics;
  operator: EndingConditionOperator;
  value: number;
  sourceText: string;
}

export interface EndingStoryFlagCondition {
  source: "storyFlag";
  key: StoryFlagId;
  expected: boolean;
  sourceText: string;
}

export interface EndingHistoryFactCondition {
  source: "historyFact";
  key: EndingHistoryFactId;
  expected: boolean;
  sourceText: string;
}

export interface EndingDerivedCondition {
  source: "derived";
  key: EndingDerivedConditionId;
  expected: boolean;
  sourceText: string;
}

export type EndingCondition =
  | EndingStatCondition
  | EndingHistoryCondition
  | EndingStoryFlagCondition
  | EndingHistoryFactCondition
  | EndingDerivedCondition;

export interface EndingDefinition {
  id: EndingId;
  type: EndingType;
  title: string;
  allOf: EndingCondition[];
  anyOf?: EndingCondition[];
  direction: string;
}

export interface EndingEvaluationContext {
  historyMetrics?: Partial<HistoryMetrics>;
  storyFlags?: Partial<StoryFlagState>;
  historyFacts?: Partial<EndingHistoryFacts>;
}

export interface EndingCandidate {
  id: EndingId;
  type: EndingType;
  title: string;
  matchedConditions: EndingCondition[];
}

export interface EndingEvaluation {
  progressEligible: boolean;
  progressReason: "weekCheckpoint" | "affectionThreshold" | "notEligible";
  derivedConditions: EndingDerivedConditions;
  candidates: EndingCandidate[];
}
