import type { EventCategory, EventTag } from "./event";
import type { GameStats, RelationshipStageId } from "./game";
import type { MemoryEffect } from "./memory";

export type ChoiceTag =
  | "self_protection"
  | "withdraw"
  | "keep_distance"
  | "wait"
  | "maintain_relationship"
  | "temporary_distance"
  | "self_growth"
  | "study"
  | "career"
  | "independent_life";

export type OutcomeTag =
  | "unstable_response"
  | "financial_crisis"
  | "career_breakdown"
  | "major_exposure"
  | "separation_pressure"
  | "self_growth"
  | "study"
  | "career"
  | "independent_life"
  | "relationship_confirmed"
  | "formal_breakup"
  | "public_reveal_succeeded"
  | "crisis_resolved";

export type EventStatus = "selected" | "active" | "resolved";

export type StoryFlagId =
  | "relationshipConfirmed"
  | "formalBreakup"
  | "majorExposureOccurred"
  | "publicOpinionOutOfControl"
  | "publicRevealEventTriggered"
  | "publicRevealSucceeded"
  | "unresolvedMajorCrisis"
  | "separationPressureActive"
  | "playerChoseLeave"
  | "playerChoseSeparation"
  | "forcedSeparation"
  | "relationshipFailedDuringExposure"
  | "playerCareerStable";

export type StoryFlagState = Record<StoryFlagId, boolean>;

export interface StoryFlagEffect {
  flag: StoryFlagId;
  value: boolean;
}

export interface WeeklyStateSnapshot extends GameStats {
  id: string;
  week: number;
  relationshipStage: RelationshipStageId;
  settlementId: string;
}

export interface ChoiceHistoryRecord {
  id: string;
  settlementId: string;
  week: number;
  eventId: string;
  choiceId: string;
  choiceText: string;
  choiceTags: ChoiceTag[];
  isImportantRelationshipEvent: boolean;
  beforeState: GameStats;
  afterState: GameStats;
  relationshipStageBefore: RelationshipStageId;
  relationshipStageAfter: RelationshipStageId;
}

export interface HistoryMetrics {
  selfGrowthEventsInLast8Weeks: number;
  selfProtectionChoiceCount: number;
  unstableResponseCount: number;
  lowMoodWeeksInLast5: number;
}

export interface StructuredSettlementOutcome {
  outcomeTags: OutcomeTag[];
  flagEffects: StoryFlagEffect[];
  eventStatus: Exclude<EventStatus, "selected">;
  memoryEffects?: MemoryEffect[];
}

export interface HistorySettlementInput {
  settlementId: string;
  week: number;
  event: {
    recordId: string;
    eventId: string;
    category: EventCategory;
    eventTags: EventTag[];
  };
  choice: {
    choiceId: string;
    choiceText: string;
    choiceTags: ChoiceTag[];
    isImportantRelationshipEvent: boolean;
  };
  beforeState: GameStats;
  afterState: GameStats;
  relationshipStageBefore: RelationshipStageId;
  relationshipStageAfter: RelationshipStageId;
  outcome: StructuredSettlementOutcome;
}
