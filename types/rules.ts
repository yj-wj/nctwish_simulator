import type { CharacterBoundaryId, CharacterId } from "./character";
import type { RelationshipStage, RelationshipStageId, StatId } from "./game";

export type InteractionLevel =
  | "formal"
  | "familiar"
  | "privateContact"
  | "limitedIntimacy"
  | "privateRelationship"
  | "intimateRelationship"
  | "majorDecision";

export type ActionType =
  | "politeConversation"
  | "simpleHelp"
  | "workContact"
  | "casualConcern"
  | "privateMessage"
  | "outsideWorkMeeting"
  | "flirt"
  | "jealousTest"
  | "lateNightContact"
  | "confession"
  | "defineRelationship"
  | "privateIntimacy"
  | "publicRelationship"
  | "breakup"
  | "wait"
  | "selfGrowth"
  | "other";

export type RomanticIntensity = "none" | "low" | "medium" | "high";
export type PhysicalIntimacy = "none" | "light" | "intimate";
export type PublicExposure = "none" | "low" | "medium" | "high";
export type ProfessionalBoundary = "respected" | "uncertain" | "crossed";
export type RiskLevel = "low" | "moderate" | "high" | "critical";

export interface StructuredPlayerAction {
  type: ActionType;
  romanticIntensity: RomanticIntensity;
  physicalIntimacy: PhysicalIntimacy;
  publicExposure: PublicExposure;
  professionalBoundary: ProfessionalBoundary;
  characterBoundarySignals?: CharacterBoundaryId[];
}

export type RuleViolationCode =
  | "relationshipMismatch"
  | "physicalBoundaryExceeded"
  | "publicRelationshipTooEarly"
  | "professionalBoundaryCrossed"
  | "characterBoundaryTriggered";

export type RuleWarningCode =
  | "rejectionLikely"
  | "awkwardReactionLikely"
  | "companyAttentionRisk"
  | "secrecyRisk"
  | "externalThreatRisk"
  | "characterNegativeReactionLikely"
  | "careerPressureContext"
  | "majorChoiceRequired";

export type NarrativeGuidanceCode =
  | "preservePlayerAgency"
  | "doNotAutoAcceptBoundaryCrossing"
  | "reactAccordingToRelationshipStage"
  | "reactAccordingToCharacterConfig"
  | "respectFirstPersonKnowledge"
  | "respectProfessionalBoundaries"
  | "keepConfirmedRelationshipPrivate"
  | "showExternalPressure"
  | "frameAsMajorRelationshipChoice";

export type SpecialTriggerId =
  | "emotional_breakdown"
  | "exposure_crisis"
  | "player_recognized"
  | "financial_crisis"
  | "company_intervention"
  | "career_breakdown";

export type TriggerOperator = "lessThan" | "greaterThan";

export interface SpecialTriggerRule {
  id: SpecialTriggerId;
  stat: Exclude<StatId, "affection">;
  operator: TriggerOperator;
  threshold: number;
}

export interface SpecialTriggerMatch extends SpecialTriggerRule {
  currentValue: number;
}

export interface CharacterBoundaryMatch {
  id: CharacterBoundaryId;
  characterId: CharacterId;
  title: string;
  description: string;
}

export interface RelationshipRule {
  stage: RelationshipStage;
  allowedInteractionLevel: InteractionLevel;
  allowedActionTypes: ActionType[];
}

export interface RuleEvaluation {
  /** Whether the action fits the current narrative boundaries. It does not block input. */
  allowed: boolean;
  /** Player input is always accepted for an in-world response. */
  canAttempt: true;
  relationshipRule: RelationshipRule;
  riskLevel: RiskLevel;
  violatedRules: RuleViolationCode[];
  warnings: RuleWarningCode[];
  matchedTriggers: SpecialTriggerMatch[];
  matchedCharacterBoundaries: CharacterBoundaryMatch[];
  narrativeGuidance: NarrativeGuidanceCode[];
  characterTraits: string[];
  characterNarrativeConstraints: string[];
}

export type RelationshipRuleDefinition = {
  stageId: RelationshipStageId;
  allowedInteractionLevel: InteractionLevel;
  allowedActionTypes: ActionType[];
};

