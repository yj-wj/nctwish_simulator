import type { CareerStage, GameModeId, RelationshipStageId, StatId } from "./game";
import type { EventStatus, OutcomeTag, StoryFlagEffect } from "./history";
import type { SpecialTriggerId, SpecialTriggerMatch } from "./rules";

export type EventCategory =
  | "daily"
  | "relationship"
  | "career"
  | "publicOpinion"
  | "company"
  | "reality"
  | "entertainment"
  | "crisis";

export type EventSourceKind = "example" | "reference";

export type EventTag =
  | "album"
  | "airport"
  | "backstage"
  | "comeback"
  | "company-intervention"
  | "concert"
  | "daily-life"
  | "emotional"
  | "fan-sign"
  | "fandom"
  | "family"
  | "financial"
  | "high-risk"
  | "housing"
  | "live"
  | "long-distance"
  | "media"
  | "member-awareness"
  | "music-show"
  | "mv"
  | "overwork"
  | "paparazzi"
  | "part-time"
  | "performance"
  | "personal-data"
  | "privacy"
  | "relationship-progress"
  | "school"
  | "sns"
  | "tour"
  | "travel"
  | "work-contact";

export type AffectedStatId = StatId | "npcRelationship";
export type StatEffectDirection = "increase" | "decrease" | "mixed";

export interface EventStatHint {
  stat: AffectedStatId;
  direction: StatEffectDirection;
}

export interface EventRequirements {
  minWeek?: number;
  maxWeek?: number;
}

export interface EventExclusions {
  relationshipStages?: RelationshipStageId[];
  careerStages?: CareerStage[];
  gameModes?: GameModeId[];
  matchedTriggers?: SpecialTriggerId[];
}

export interface EventTemplate {
  id: string;
  category: EventCategory;
  title: string;
  description?: string;
  sourceKind: EventSourceKind;
  tags: EventTag[];
  requirements?: EventRequirements;
  exclusions?: EventExclusions;
  baseWeight: number;
  affectedStats?: EventStatHint[];
  cooldown?: number;
  oncePerSave?: boolean;
  relationshipStages?: RelationshipStageId[];
  careerStages?: CareerStage[];
  gameModes?: GameModeId[];
  requiredTriggers?: SpecialTriggerId[];
}

export interface EventHistoryEntry {
  recordId: string;
  eventId: string;
  week: number;
  category: EventCategory;
  eventTags: EventTag[];
  outcomeTags: OutcomeTag[];
  status: EventStatus;
  settlementId?: string;
  flagEffects: StoryFlagEffect[];
}

export type EventFilterReasonCode =
  | "relationshipStage"
  | "week"
  | "careerStage"
  | "gameMode"
  | "missingTrigger"
  | "excludedByState"
  | "cooldown"
  | "oncePerSave";

export interface EventFilterReason {
  code: EventFilterReasonCode;
  detail: string;
}

export interface FilteredEvent {
  event: EventTemplate;
  reasons: EventFilterReason[];
}

export interface EventWeightBreakdown {
  baseWeight: number;
  gameModeModifier: number;
  relationshipModifier: number;
  triggerModifier: number;
  careerStageModifier: number;
  recentEventPenalty: number;
  finalWeight: number;
}

export interface WeightedEventCandidate {
  event: EventTemplate;
  weight: EventWeightBreakdown;
}

export interface EventEngineContext {
  history?: EventHistoryEntry[];
  matchedTriggers?: SpecialTriggerMatch[];
  recentWindow?: number;
  seed?: number | string;
}

export interface EventEligibilityResult {
  matchedTriggers: SpecialTriggerMatch[];
  eligibleEvents: EventTemplate[];
  filteredEvents: FilteredEvent[];
}

export interface EventEngineResult {
  matchedTriggers: SpecialTriggerMatch[];
  eligibleEvents: WeightedEventCandidate[];
  filteredEvents: FilteredEvent[];
  selectedEvent: WeightedEventCandidate | null;
}

