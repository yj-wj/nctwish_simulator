import { z } from "zod";
import { allowedChoiceTags, allowedEffectMagnitudes, allowedOutcomeTags, allowedTurnStats } from "../config/turn-policy.ts";
import { CHAT_PROMPT_VERSION } from "../config/chat.ts";
import { unifiedWorldContextSchema } from "./schemas.ts";

const relationshipStages = ["strangers", "noticed", "interested", "ambiguous", "committed", "inLove", "trial"] as const;
const entityIdSchema = z.string().min(1);

export const chatGenerationInputSchema = z.object({
  promptVersion: z.literal(CHAT_PROMPT_VERSION),
  mode: z.enum(["reply", "incoming"]),
  playerMessage: z.string().trim().min(1).max(500).nullable(),
  incomingReason: z.enum(["relationship_confirmed_follow_up", "exposure_concern", "career_pressure_check_in"]).nullable(),
  context: z.object({
    threadId: z.string().min(1),
    player: z.object({ name: z.string().min(1), age: z.number().int().min(18), identity: z.string().min(1) }).strict(),
    maleLead: z.object({
      id: z.enum(["sion", "riku", "yushi", "jaehee", "ryo", "sakuya"]),
      name: z.string().min(1), displayName: z.string().min(1), publicPersona: z.string().min(1), privatePersona: z.string().nullable(),
      traits: z.array(z.string().min(1)), romanceTaboos: z.array(z.object({ title: z.string().min(1), description: z.string().min(1) }).strict()),
      narrativeConstraints: z.array(z.string().min(1)),
    }).strict(),
    gameState: z.object({
      week: z.number().int().positive(), relationshipStage: z.enum(relationshipStages),
      mood: z.number(), secrecy: z.number(), companyAlert: z.number(), careerPressure: z.number(),
    }).strict(),
    storyFacts: z.array(z.string().min(1)),
    world: unifiedWorldContextSchema,
    recentMessages: z.array(z.object({ senderId: z.string().min(1), content: z.string().min(1), sequence: z.number().int().nonnegative() }).strict()).max(10),
    relevantMemories: z.array(z.object({ id: z.string().min(1), summary: z.string().min(1), type: z.string().min(1), importance: z.number().int().min(1).max(5) }).strict()).max(6),
    ruleEvaluation: z.object({
      riskLevel: z.enum(["low", "moderate", "high", "critical"]),
      allowedInteractionLevel: z.string().min(1), warnings: z.array(z.string()), violatedRules: z.array(z.string()), narrativeConstraints: z.array(z.string()),
    }).strict(),
    diagnostics: z.object({ recentMessagesCount: z.number().int().nonnegative(), relevantMemoriesCount: z.number().int().nonnegative(), excludedHiddenMemories: z.number().int().nonnegative() }).strict(),
  }).strict(),
}).strict();

export const chatGenerationOutputSchema = z.object({
  messages: z.array(z.string().trim().min(1).max(300)).min(1).max(4),
  effectCategory: z.enum(["none", "relationship", "support", "conflict"]),
  suggestedEffects: z.array(z.object({ stat: z.enum(allowedTurnStats), magnitude: z.enum(allowedEffectMagnitudes), reason: z.string().trim().min(1) }).strict()).max(3).default([]),
  suggestedChoiceTags: z.array(z.enum(allowedChoiceTags)).default([]),
  suggestedOutcomeTags: z.array(z.enum(allowedOutcomeTags)).default([]),
  memoryCandidates: z.array(z.object({
    type: z.enum(["short_term", "relationship", "long_term"]), summary: z.string().trim().min(1).max(360),
    actors: z.array(entityIdSchema).min(1), tags: z.array(z.string().trim().min(1)), importance: z.number().int().min(1).max(5),
  }).strict()).max(2).default([]),
}).strict();

export type ChatGenerationInput = z.infer<typeof chatGenerationInputSchema>;
export type ChatGenerationOutput = z.infer<typeof chatGenerationOutputSchema>;
