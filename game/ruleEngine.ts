import { getCharacter } from "../config/characters/index.ts";
import { relationshipRuleDefinitions } from "../config/relationship-rules.ts";
import { specialTriggerRules } from "../config/special-trigger-rules.ts";
import type { GameState, RelationshipStage } from "../types/game.ts";
import type {
  ActionType,
  CharacterBoundaryMatch,
  InteractionLevel,
  NarrativeGuidanceCode,
  RelationshipRule,
  RiskLevel,
  RuleEvaluation,
  RuleViolationCode,
  RuleWarningCode,
  SpecialTriggerMatch,
  StructuredPlayerAction,
} from "../types/rules.ts";
import { getRelationshipStage } from "./relationship.ts";

const professionalIdentityIds = new Set(["intern", "staff", "stylist", "translator"]);

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function getAllowedInteractionLevel(stage: RelationshipStage): InteractionLevel {
  const definition = relationshipRuleDefinitions.find(({ stageId }) => stageId === stage.id);
  if (!definition) throw new Error(`No relationship rule configured for stage ${stage.id}.`);
  return definition.allowedInteractionLevel;
}

export function getRelationshipRule(gameState: GameState): RelationshipRule {
  const stage = getRelationshipStage(gameState.stats.affection);
  const definition = relationshipRuleDefinitions.find(({ stageId }) => stageId === stage.id);
  if (!definition) throw new Error(`No relationship rule configured for stage ${stage.id}.`);
  return {
    stage,
    allowedInteractionLevel: definition.allowedInteractionLevel,
    allowedActionTypes: [...definition.allowedActionTypes],
  };
}

export function getMatchedTriggers(gameState: GameState): SpecialTriggerMatch[] {
  return specialTriggerRules.flatMap((rule) => {
    const currentValue = gameState.stats[rule.stat];
    const matches = rule.operator === "lessThan"
      ? currentValue < rule.threshold
      : currentValue > rule.threshold;
    return matches ? [{ ...rule, currentValue }] : [];
  });
}

function getCharacterBoundaryMatches(gameState: GameState, action: StructuredPlayerAction): CharacterBoundaryMatch[] {
  const signals = new Set(action.characterBoundarySignals ?? []);
  if (signals.size === 0) return [];
  const character = getCharacter(gameState.maleLead);
  return character.romanceTaboos
    .filter(({ id }) => signals.has(id))
    .map(({ id, title, description }) => ({ id, title, description, characterId: character.id }));
}

function exceedsPhysicalBoundary(stage: RelationshipStage, action: StructuredPlayerAction): boolean {
  if (action.physicalIntimacy === "none") return false;
  if (action.physicalIntimacy === "light") {
    return ["strangers", "noticed", "interested"].includes(stage.id);
  }
  return ["strangers", "noticed", "interested", "ambiguous"].includes(stage.id);
}

function exceedsRomanticBoundary(stage: RelationshipStage, action: StructuredPlayerAction): boolean {
  if (action.romanticIntensity === "none" || action.romanticIntensity === "low") return false;
  if (action.romanticIntensity === "medium") return ["strangers", "noticed"].includes(stage.id);
  return ["strangers", "noticed", "interested"].includes(stage.id);
}

function collectViolations(
  gameState: GameState,
  action: StructuredPlayerAction,
  relationshipRule: RelationshipRule,
  characterBoundaries: CharacterBoundaryMatch[],
): RuleViolationCode[] {
  const violations: RuleViolationCode[] = [];
  const actionFitsStage = relationshipRule.allowedActionTypes.includes(action.type);
  if (!actionFitsStage || exceedsRomanticBoundary(relationshipRule.stage, action)) {
    violations.push("relationshipMismatch");
  }
  if (exceedsPhysicalBoundary(relationshipRule.stage, action)) {
    violations.push("physicalBoundaryExceeded");
  }
  if (action.type === "publicRelationship" && relationshipRule.stage.id !== "trial") {
    violations.push("publicRelationshipTooEarly");
  }
  if (action.professionalBoundary === "crossed") {
    violations.push("professionalBoundaryCrossed");
  }
  if (characterBoundaries.length > 0) {
    violations.push("characterBoundaryTriggered");
  }
  return unique(violations);
}

function collectWarnings(
  gameState: GameState,
  action: StructuredPlayerAction,
  relationshipRule: RelationshipRule,
  violations: RuleViolationCode[],
  matchedTriggers: SpecialTriggerMatch[],
): RuleWarningCode[] {
  const warnings: RuleWarningCode[] = [];
  if (violations.includes("relationshipMismatch") || violations.includes("physicalBoundaryExceeded")) {
    warnings.push("awkwardReactionLikely");
    if (["strangers", "noticed"].includes(relationshipRule.stage.id)) warnings.push("rejectionLikely");
  }
  if (violations.includes("characterBoundaryTriggered")) warnings.push("characterNegativeReactionLikely");
  if (action.publicExposure === "medium" || action.publicExposure === "high") {
    warnings.push("secrecyRisk", "companyAttentionRisk");
  }
  if (action.type === "publicRelationship" || ["committed", "inLove"].includes(relationshipRule.stage.id)) {
    warnings.push("secrecyRisk");
  }
  if (relationshipRule.stage.id === "inLove") warnings.push("externalThreatRisk");
  if (relationshipRule.stage.id === "trial") warnings.push("majorChoiceRequired");
  const triggerIds = new Set(matchedTriggers.map(({ id }) => id));
  if (triggerIds.has("exposure_crisis")) warnings.push("secrecyRisk", "externalThreatRisk");
  if (triggerIds.has("company_intervention")) warnings.push("companyAttentionRisk");
  if (triggerIds.has("career_breakdown")) warnings.push("careerPressureContext");
  if (action.professionalBoundary !== "respected" && professionalIdentityIds.has(gameState.player.identityId)) {
    warnings.push("companyAttentionRisk");
  }
  return unique(warnings);
}

function getRiskLevel(
  action: StructuredPlayerAction,
  violations: RuleViolationCode[],
  warnings: RuleWarningCode[],
  matchedTriggers: SpecialTriggerMatch[],
): RiskLevel {
  const triggerIds = new Set(matchedTriggers.map(({ id }) => id));
  if (
    violations.includes("publicRelationshipTooEarly") ||
    (action.publicExposure === "high" && (triggerIds.has("exposure_crisis") || triggerIds.has("company_intervention")))
  ) return "critical";
  if (violations.length > 0 || action.publicExposure === "high" || action.professionalBoundary === "crossed") return "high";
  if (warnings.length > 0 || matchedTriggers.length > 0 || action.publicExposure === "medium") return "moderate";
  return "low";
}

function getNarrativeGuidance(
  relationshipRule: RelationshipRule,
  violations: RuleViolationCode[],
  matchedTriggers: SpecialTriggerMatch[],
): NarrativeGuidanceCode[] {
  const guidance: NarrativeGuidanceCode[] = [
    "preservePlayerAgency",
    "reactAccordingToRelationshipStage",
    "reactAccordingToCharacterConfig",
    "respectFirstPersonKnowledge",
    "respectProfessionalBoundaries",
  ];
  if (violations.length > 0) guidance.push("doNotAutoAcceptBoundaryCrossing");
  if (["committed", "inLove"].includes(relationshipRule.stage.id)) guidance.push("keepConfirmedRelationshipPrivate");
  if (
    relationshipRule.stage.id === "inLove" ||
    matchedTriggers.some(({ id }) => id === "exposure_crisis" || id === "company_intervention")
  ) guidance.push("showExternalPressure");
  if (relationshipRule.stage.id === "trial") guidance.push("frameAsMajorRelationshipChoice");
  return unique(guidance);
}

export function getRuleWarnings(gameState: GameState, action: StructuredPlayerAction): RuleWarningCode[] {
  const relationshipRule = getRelationshipRule(gameState);
  const matchedTriggers = getMatchedTriggers(gameState);
  const characterBoundaries = getCharacterBoundaryMatches(gameState, action);
  const violations = collectViolations(gameState, action, relationshipRule, characterBoundaries);
  return collectWarnings(gameState, action, relationshipRule, violations, matchedTriggers);
}

export function evaluateAction(gameState: GameState, action: StructuredPlayerAction): RuleEvaluation {
  const relationshipRule = getRelationshipRule(gameState);
  const matchedTriggers = getMatchedTriggers(gameState);
  const matchedCharacterBoundaries = getCharacterBoundaryMatches(gameState, action);
  const violatedRules = collectViolations(gameState, action, relationshipRule, matchedCharacterBoundaries);
  const warnings = collectWarnings(gameState, action, relationshipRule, violatedRules, matchedTriggers);
  const character = getCharacter(gameState.maleLead);
  return {
    allowed: violatedRules.length === 0,
    canAttempt: true,
    relationshipRule,
    riskLevel: getRiskLevel(action, violatedRules, warnings, matchedTriggers),
    violatedRules,
    warnings,
    matchedTriggers,
    matchedCharacterBoundaries,
    narrativeGuidance: getNarrativeGuidance(relationshipRule, violatedRules, matchedTriggers),
    characterTraits: [...character.traits],
    characterNarrativeConstraints: [...character.narrativeConstraints],
  };
}

export function isActionTypeAllowed(gameState: GameState, actionType: ActionType): boolean {
  return getRelationshipRule(gameState).allowedActionTypes.includes(actionType);
}

