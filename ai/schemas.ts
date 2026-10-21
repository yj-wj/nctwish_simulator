import { z } from "zod";
import {
  allowedChoiceTags,
  allowedEffectMagnitudes,
  allowedOutcomeTags,
  allowedTurnStats,
} from "../config/turn-policy.ts";

const relationshipStages = ["strangers", "noticed", "interested", "ambiguous", "committed", "inLove", "trial"] as const;
const eventCategories = ["daily", "relationship", "career", "publicOpinion", "company", "reality", "entertainment", "crisis"] as const;
const storyFlags = ["relationshipConfirmed", "formalBreakup", "majorExposureOccurred", "publicOpinionOutOfControl", "publicRevealEventTriggered", "publicRevealSucceeded", "unresolvedMajorCrisis", "separationPressureActive", "playerChoseLeave", "playerChoseSeparation", "forcedSeparation", "relationshipFailedDuringExposure", "playerCareerStable"] as const;

const gameStatsSchema = z.object(Object.fromEntries(allowedTurnStats.map((id) => [id, z.number().finite()])) as Record<(typeof allowedTurnStats)[number], z.ZodNumber>).strict();
const entityIdSchema = z.string().min(1);
const actionTypes = ["politeConversation", "simpleHelp", "workContact", "casualConcern", "privateMessage", "outsideWorkMeeting", "flirt", "jealousTest", "lateNightContact", "confession", "defineRelationship", "privateIntimacy", "publicRelationship", "breakup", "wait", "selfGrowth", "other"] as const;
const actionSemanticTags = ["self_protection", "withdraw", "keep_distance", "wait", "maintain_relationship", "temporary_distance", "self_growth", "study", "career", "independent_life"] as const;
const worldTriggerTypes = ["relationship_confirmed", "exposure_started", "public_opinion_crisis", "company_intervention", "career_breakdown", "temporary_distance", "major_argument", "financial_crisis"] as const;

export const unifiedWorldContextSchema = z.object({
  gameState: z.object({ week: z.number().int().positive(), scene: z.string(), careerStage: z.string(), stats: gameStatsSchema }).strict(),
  relationshipStage: z.enum(relationshipStages),
  storyFacts: z.array(z.enum(storyFlags)),
  currentEvent: z.object({ id: z.string(), category: z.enum(eventCategories), title: z.string(), actorIds: z.array(entityIdSchema) }).strict().nullable(),
  relevantNPCs: z.array(z.object({
    id: z.string().regex(/^npc:/), name: z.string(), role: z.string(), relationshipToPlayer: z.string(),
    personality: z.array(z.string()),
    relationship: z.object({ trust: z.number(), closeness: z.number(), tension: z.number() }).strict(),
    tags: z.array(z.string()),
  }).strict()).max(4),
  activeCrises: z.array(z.object({ id: z.enum(["exposure", "public_opinion", "company", "career", "financial", "separation"]), sourceIds: z.array(z.string()) }).strict()),
  recentEventIds: z.array(z.string()).max(4),
  relevantMemories: z.array(z.object({ id: z.string(), content: z.string(), actors: z.array(entityIdSchema), tags: z.array(z.string()), visibility: z.enum(["player_known", "shared", "hidden"]) }).strict()).max(6),
  recentChatOutcomes: z.array(z.string()).max(3),
  recentSNSOutcomes: z.array(z.string()).max(3),
  pendingTriggerTypes: z.array(z.enum(worldTriggerTypes)),
}).strict();

export const actionInterpretationInputSchema = z.object({
  promptVersion: z.literal("action-v1"),
  playerText: z.string().trim().min(1).max(500),
  context: z.object({
    relationshipStage: z.enum(relationshipStages),
    event: z.object({ id: z.string().min(1), category: z.enum(eventCategories), title: z.string().min(1), tags: z.array(z.string().min(1)) }).strict().nullable(),
    allowedInteractionLevel: z.enum(["formal", "familiar", "privateContact", "limitedIntimacy", "privateRelationship", "intimateRelationship", "majorDecision"]),
    allowedActionTypes: z.array(z.enum(actionTypes)),
    warnings: z.array(z.string().min(1)),
    narrativeConstraints: z.array(z.string().min(1)),
    allowedInteractions: z.array(z.string().min(1)),
    prohibitedInteractions: z.array(z.string().min(1)),
    knownActorIds: z.array(entityIdSchema).min(2),
  }).strict(),
}).strict();

export const actionInterpretationOutputSchema = z.object({
  intentSummary: z.string().trim().min(1),
  actionType: z.enum(actionTypes),
  targetActorIds: z.array(entityIdSchema),
  semanticTags: z.array(z.enum(actionSemanticTags)),
  romanticIntensity: z.enum(["none", "low", "medium", "high"]),
  publicExposure: z.enum(["low", "medium", "high"]),
  boundaryRisk: z.enum(["low", "medium", "high"]),
  confidence: z.number().min(0).max(1),
}).strict();

export const storyGenerationInputSchema = z.object({
  promptVersion: z.literal("story-v2"),
  context: z.object({
    narrativeRules: z.array(z.string().min(1)).min(1),
    player: z.object({
      name: z.string().min(1), age: z.number().int().min(18),
      identity: z.object({ id: z.string().min(1), name: z.string().min(1), description: z.string() }).strict(),
      fanLevel: z.object({ id: z.string().min(1), name: z.string().min(1) }).strict(),
      gameMode: z.object({ id: z.enum(["slow", "standard", "pressure", "healing"]), name: z.string().min(1), description: z.string().min(1) }).strict(),
    }).strict(),
    maleLead: z.object({
      id: z.enum(["sion", "riku", "yushi", "jaehee", "ryo", "sakuya"]),
      name: z.string().min(1), displayName: z.string().min(1), publicPersona: z.string().min(1), privatePersona: z.string().nullable(),
      traits: z.array(z.string().min(1)),
      romanceTaboos: z.array(z.object({ id: z.string().min(1), title: z.string().min(1), description: z.string().min(1) }).strict()),
      behaviorConstraints: z.array(z.string().min(1)),
    }).strict(),
    gameState: z.object({
      week: z.number().int().positive(), scene: z.string().min(1), careerStage: z.string().min(1),
      relationshipStage: z.enum(relationshipStages), stats: gameStatsSchema,
    }).strict(),
    event: z.object({ id: z.string().min(1), category: z.enum(eventCategories), title: z.string().min(1), description: z.string().nullable(), tags: z.array(z.string().min(1)), actorIds: z.array(entityIdSchema) }).strict().nullable(),
    ruleEvaluation: z.object({
      allowedInteractionLevel: z.enum(["formal", "familiar", "privateContact", "limitedIntimacy", "privateRelationship", "intimateRelationship", "majorDecision"]),
      allowedActionTypes: z.array(z.enum(actionTypes)),
      riskLevel: z.enum(["low", "moderate", "high", "critical"]),
      warnings: z.array(z.string().min(1)), matchedTriggers: z.array(z.string().min(1)), narrativeConstraints: z.array(z.string().min(1)),
      allowedInteractions: z.array(z.string().min(1)), prohibitedInteractions: z.array(z.string().min(1)),
    }).strict(),
    storyFacts: z.array(z.enum(storyFlags)),
    world: unifiedWorldContextSchema,
    continuity: z.object({
      turnPhase: z.enum(["new_game_first_turn", "subsequent_turn"]),
      recentOpenings: z.array(z.string().trim().min(1).max(160)).max(3),
    }).strict(),
    recentEvents: z.array(z.object({
      recordId: z.string().min(1), eventId: z.string().min(1), week: z.number().int().positive(), category: z.enum(eventCategories),
      tags: z.array(z.string().min(1)), outcomeTags: z.array(z.enum(allowedOutcomeTags)), status: z.enum(["selected", "active", "resolved"]),
    }).strict()),
    relevantMemories: z.array(z.object({
      id: z.string().min(1), week: z.number().int().positive(), type: z.enum(["short_term", "long_term", "relationship", "hidden"]),
      summary: z.string().min(1), actors: z.array(entityIdSchema).min(1), tags: z.array(z.string().min(1)), importance: z.number().int().min(1).max(5), score: z.number().finite(),
    }).strict()),
    diagnostics: z.object({
      recentEventLimit: z.number().int().nonnegative(), relevantMemoryLimit: z.number().int().nonnegative(), includedRecentEvents: z.number().int().nonnegative(),
      excludedOlderEvents: z.number().int().nonnegative(), includedMemories: z.number().int().nonnegative(), excludedMemoriesByVisibility: z.number().int().nonnegative(), excludedMemoriesByLimit: z.number().int().nonnegative(),
    }).strict(),
  }).strict(),
  playerAction: z.object({ type: z.enum(["choice", "free_action", "continue"]), text: z.string().min(1).optional() }).strict().optional(),
}).strict();

export const storyGenerationOutputSchema = z.object({
  title: z.string().trim().min(1),
  story: z.string().trim().min(1),
  choices: z.array(z.object({ id: z.enum(["A", "B", "C"]), text: z.string().trim().min(1) }).strict()).length(3)
    .refine((choices) => new Set(choices.map(({ id }) => id)).size === choices.length, { message: "Choice ids must be unique." }),
  suggestedEffects: z.array(z.object({ stat: z.enum(allowedTurnStats), magnitude: z.enum(allowedEffectMagnitudes), reason: z.string().trim().min(1) }).strict()).default([]),
  suggestedChoiceTags: z.array(z.enum(allowedChoiceTags)).default([]),
  suggestedOutcomeTags: z.array(z.enum(allowedOutcomeTags)).default([]),
  memoryCandidates: z.array(z.object({
    type: z.enum(["short_term", "relationship", "long_term"]), summary: z.string().trim().min(1), actors: z.array(entityIdSchema).min(1),
    tags: z.array(z.string().trim().min(1)), importance: z.number().int().min(1).max(5),
  }).strict()).default([]),
}).strict();

export type StoryGenerationInput = z.infer<typeof storyGenerationInputSchema>;
export type StoryGenerationOutput = z.infer<typeof storyGenerationOutputSchema>;
export type ActionInterpretationInput = z.infer<typeof actionInterpretationInputSchema>;
export type ActionInterpretationOutput = z.infer<typeof actionInterpretationOutputSchema>;
