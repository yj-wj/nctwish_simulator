import type { StatId } from "./game";

export type EndingType = "HE" | "OE" | "BE" | "SE";

export type EndingId =
  | "HE_SECRET_STABLE"
  | "OE_WAITING"
  | "BE_EXPOSURE"
  | "BE_PLAYER_LEAVES"
  | "SE_PUBLIC_RELATIONSHIP";

export interface EndingHistoryMetrics {
  selfGrowthEventCount: number;
  selfProtectionChoiceCount: number;
  unstableResponseCount: number;
  lowMoodWeeksInLast5: number;
}

export type EndingHistoryMetricId = keyof EndingHistoryMetrics;

export interface EndingStoryFlags {
  relationshipConfirmed: boolean;
  formalBreakup: boolean;
  majorExposureOccurred: boolean;
  publicOpinionOutOfControl: boolean;
  publicRevealEventTriggered: boolean;
  publicRevealSucceeded: boolean;
  unresolvedMajorCrisis: boolean;
  separationPressureActive: boolean;
  playerChoseLeave: boolean;
  playerChoseSeparation: boolean;
  forcedSeparation: boolean;
  relationshipFailedDuringExposure: boolean;
  playerCareerStable: boolean;
  unresolvedFinancialCrisis: boolean;
  waitOrMaintainRelationshipChoiceMade: boolean;
  unresolvedCareerBreakdownInLast4Weeks: boolean;
}

export type EndingStoryFlagId = keyof EndingStoryFlags;

export interface EndingContext {
  historyMetrics: EndingHistoryMetrics;
  storyFlags: EndingStoryFlags;
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
  key: EndingHistoryMetricId;
  operator: EndingConditionOperator;
  value: number;
  sourceText: string;
}

export interface EndingStoryFlagCondition {
  source: "storyFlag";
  key: EndingStoryFlagId;
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
  historyMetrics?: Partial<EndingHistoryMetrics>;
  storyFlags?: Partial<EndingStoryFlags>;
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
