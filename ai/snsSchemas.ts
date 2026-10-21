import { z } from "zod";
import { SNS_PROMPT_VERSION } from "../config/sns.ts";

const accountTypeSchema = z.enum(["official", "company", "media", "fansite", "fan", "anonymous"]);
const sentimentSchema = z.enum(["positive", "neutral", "mixed", "negative"]);
const visibilitySchema = z.enum(["public", "fandom"]);
const levelSchema = z.enum(["normal", "attention", "rumor", "controversy", "crisis"]);
const reasonSchema = z.enum(["performance_buzz", "airport_sighting", "fandom_discussion", "company_statement", "relationship_rumor", "exposure_leak", "paparazzi_exposure", "popularity_spike"]);
const postTagSchema = z.enum(["official", "performance", "airport", "fandom", "relationship_rumor", "exposure", "company", "privacy", "career"]);

export const snsGenerationInputSchema = z.object({
  promptVersion: z.literal(SNS_PROMPT_VERSION),
  context: z.object({
    trigger: z.object({
      id: z.string().min(1), reason: reasonSchema, level: levelSchema, week: z.number().int().min(1),
      publicTitle: z.string().min(1), publicSummary: z.string().min(1), sourceEventId: z.string().nullable(),
      sourceCategory: z.enum(["daily", "relationship", "career", "publicOpinion", "company", "reality", "entertainment", "crisis"]),
      sourceTags: z.array(z.string()), allowedAccountTypes: z.array(accountTypeSchema), allowedTopicTags: z.array(postTagSchema),
    }).strict(),
    maleLead: z.object({ id: z.string().min(1), displayName: z.string().min(1), publicPersona: z.string().min(1) }).strict(),
    publicState: z.object({ popularity: z.number(), companyAlert: z.number(), careerPressure: z.number() }).strict(),
    publicStoryFacts: z.array(z.enum(["majorExposureOccurred", "publicOpinionOutOfControl", "publicRevealEventTriggered", "publicRevealSucceeded"])),
    recentPosts: z.array(z.object({ accountType: accountTypeSchema, content: z.string().min(1), sentiment: sentimentSchema }).strict()).max(8),
    diagnostics: z.object({ excludedHiddenMemories: z.number().int().nonnegative(), privateMemoryIncluded: z.literal(false) }).strict(),
  }).strict(),
}).strict();

export const snsGenerationOutputSchema = z.object({
  posts: z.array(z.object({
    authorId: z.string().trim().min(1).max(80), authorName: z.string().trim().min(1).max(80), handle: z.string().trim().min(1).max(80),
    accountType: accountTypeSchema, content: z.string().trim().min(1).max(320), visibility: visibilitySchema,
    sentiment: sentimentSchema, topicTags: z.array(postTagSchema).min(1).max(5),
  }).strict()).min(1).max(4),
}).strict();

export type SNSGenerationInput = z.infer<typeof snsGenerationInputSchema>;
export type SNSGenerationOutput = z.infer<typeof snsGenerationOutputSchema>;
