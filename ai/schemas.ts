import { z } from "zod";

const statIds = ["affection", "popularity", "mood", "money", "secrecy", "companyAlert", "careerPressure"] as const;
const magnitudes = ["large_negative", "medium_negative", "small_negative", "none", "small_positive", "medium_positive", "large_positive"] as const;
const relationshipStages = ["strangers", "noticed", "interested", "ambiguous", "committed", "inLove", "trial"] as const;
const eventCategories = ["daily", "relationship", "career", "publicOpinion", "company", "reality", "entertainment", "crisis"] as const;
const choiceTags = ["self_protection", "withdraw", "keep_distance", "wait", "maintain_relationship", "temporary_distance", "self_growth", "study", "career", "independent_life", "public_confession"] as const;
const outcomeTags = ["unstable_response", "financial_crisis", "career_breakdown", "major_exposure", "separation_pressure", "self_growth", "study", "career", "independent_life"] as const;
const storyFlags = ["relationshipConfirmed", "formalBreakup", "majorExposureOccurred", "publicOpinionOutOfControl", "publicRevealEventTriggered", "publicRevealSucceeded", "unresolvedMajorCrisis", "separationPressureActive", "playerChoseLeave", "playerChoseSeparation", "forcedSeparation", "relationshipFailedDuringExposure", "playerCareerStable"] as const;

const gameStatsSchema = z.object(Object.fromEntries(statIds.map((id) => [id, z.number().finite()])) as Record<(typeof statIds)[number], z.ZodNumber>).strict();
const entityIdSchema = z.string().min(1);

export const storyGenerationInputSchema = z.object({
  promptVersion: z.literal("story-v1"),
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
    event: z.object({ id: z.string().min(1), category: z.enum(eventCategories), title: z.string().min(1), description: z.string().nullable(), tags: z.array(z.string().min(1)) }).strict().nullable(),
    ruleEvaluation: z.object({
      allowedInteractionLevel: z.enum(["formal", "familiar", "privateContact", "limitedIntimacy", "privateRelationship", "intimateRelationship", "majorDecision"]),
      riskLevel: z.enum(["low", "moderate", "high", "critical"]),
      warnings: z.array(z.string().min(1)), matchedTriggers: z.array(z.string().min(1)), narrativeConstraints: z.array(z.string().min(1)),
      allowedInteractions: z.array(z.string().min(1)), prohibitedInteractions: z.array(z.string().min(1)),
    }).strict(),
    storyFacts: z.array(z.enum(storyFlags)),
    recentEvents: z.array(z.object({
      recordId: z.string().min(1), eventId: z.string().min(1), week: z.number().int().positive(), category: z.enum(eventCategories),
      tags: z.array(z.string().min(1)), outcomeTags: z.array(z.enum(outcomeTags)), status: z.enum(["selected", "active", "resolved"]),
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
  suggestedEffects: z.array(z.object({ stat: z.enum(statIds), magnitude: z.enum(magnitudes), reason: z.string().trim().min(1) }).strict()).default([]),
  suggestedChoiceTags: z.array(z.enum(choiceTags)).default([]),
  suggestedOutcomeTags: z.array(z.enum(outcomeTags)).default([]),
  memoryCandidates: z.array(z.object({
    type: z.enum(["short_term", "relationship", "long_term"]), summary: z.string().trim().min(1), actors: z.array(entityIdSchema).min(1),
    tags: z.array(z.string().trim().min(1)), importance: z.number().int().min(1).max(5),
  }).strict()).default([]),
}).strict();

export type StoryGenerationInput = z.infer<typeof storyGenerationInputSchema>;
export type StoryGenerationOutput = z.infer<typeof storyGenerationOutputSchema>;
