import { z } from "zod";
import { GAME_SAVE_SCHEMA_VERSION } from "../types/save.ts";

const characterIdSchema = z.enum(["sion", "riku", "yushi", "jaehee", "ryo", "sakuya"]);
const identityIdSchema = z.enum(["student", "fan", "intern", "staff", "stylist", "translator", "part-time", "custom"]);
const fanLevelIdSchema = z.enum(["longtime", "casual", "passerby", "returning", "single"]);
const gameModeIdSchema = z.enum(["slow", "standard", "pressure", "healing"]);
const relationshipStageSchema = z.enum(["strangers", "noticed", "interested", "ambiguous", "committed", "inLove", "trial"]);
const careerStageSchema = z.enum(["回归期", "巡演期", "个人活动期", "拍摄期", "休整期"]);
const eventCategorySchema = z.enum(["daily", "relationship", "career", "publicOpinion", "company", "reality", "entertainment", "crisis"]);
const eventStatusSchema = z.enum(["selected", "active", "resolved"]);
const eventTagSchema = z.enum([
  "album", "airport", "backstage", "comeback", "company-intervention", "concert",
  "daily-life", "emotional", "fan-sign", "fandom", "family", "financial", "high-risk",
  "housing", "live", "long-distance", "media", "member-awareness", "music-show", "mv",
  "overwork", "paparazzi", "part-time", "performance", "personal-data", "privacy",
  "relationship-progress", "school", "sns", "tour", "travel", "work-contact",
]);
const choiceTagSchema = z.enum([
  "self_protection", "withdraw", "keep_distance", "wait", "maintain_relationship",
  "temporary_distance", "self_growth", "study", "career", "independent_life",
]);
const outcomeTagSchema = z.enum([
  "unstable_response", "financial_crisis", "career_breakdown", "major_exposure",
  "separation_pressure", "self_growth", "study", "career", "independent_life",
  "relationship_confirmed", "formal_breakup", "public_reveal_succeeded", "crisis_resolved",
]);
const storyFlagIdSchema = z.enum([
  "relationshipConfirmed", "formalBreakup", "majorExposureOccurred", "publicOpinionOutOfControl",
  "publicRevealEventTriggered", "publicRevealSucceeded", "unresolvedMajorCrisis",
  "separationPressureActive", "playerChoseLeave", "playerChoseSeparation", "forcedSeparation",
  "relationshipFailedDuringExposure", "playerCareerStable",
]);
const effectMagnitudeSchema = z.enum([
  "large_negative", "medium_negative", "small_negative", "none",
  "small_positive", "medium_positive", "large_positive",
]);
const memoryTypeSchema = z.enum(["short_term", "long_term", "relationship", "hidden"]);
const memoryVisibilitySchema = z.enum(["player_known", "shared", "hidden"]);
const entityIdSchema = z.union([
  z.literal("player"),
  characterIdSchema,
  z.string().regex(/^npc:[a-zA-Z0-9_-]+$/),
]);

const gameStatsSchema = z.object({
  affection: z.number().min(0).max(100),
  popularity: z.number().min(0).max(100),
  mood: z.number().min(0).max(100),
  money: z.number().min(0),
  secrecy: z.number().min(0).max(100),
  companyAlert: z.number().min(0).max(100),
  careerPressure: z.number().min(0).max(100),
});

const playerDraftSchema = z.object({
  name: z.string().min(1),
  age: z.string().regex(/^\d+$/),
  identityId: identityIdSchema,
  customIdentity: z.string(),
  maleLeadId: characterIdSchema,
  fanLevelId: fanLevelIdSchema,
  gameModeId: gameModeIdSchema,
});

const gameStateSchema = z.object({
  gameId: z.string().min(1),
  week: z.number().int().min(1),
  currentScene: z.string().min(1),
  careerStage: careerStageSchema,
  player: z.object({
    name: z.string().min(1),
    age: z.number().int().min(18),
    identityId: identityIdSchema,
    customIdentity: z.string().optional(),
    fanLevelId: fanLevelIdSchema,
  }),
  maleLead: characterIdSchema,
  gameMode: gameModeIdSchema,
  stats: gameStatsSchema,
});

const storyFlagEffectSchema = z.object({ flag: storyFlagIdSchema, value: z.boolean() });
const memoryEffectSchema = z.object({
  key: z.string().min(1),
  type: memoryTypeSchema,
  content: z.string().min(1),
  actors: z.array(z.union([entityIdSchema, z.literal("current_male_lead")])),
  tags: z.array(z.string()),
  importance: z.number().int().min(1).max(5),
  emotion: z.string().nullable().optional(),
  visibility: memoryVisibilitySchema,
  knownBy: z.array(z.union([entityIdSchema, z.literal("current_male_lead")])),
  sourceKind: z.enum(["event", "choice", "outcome"]).optional(),
});
const structuredOutcomeSchema = z.object({
  outcomeTags: z.array(outcomeTagSchema),
  flagEffects: z.array(storyFlagEffectSchema),
  eventStatus: z.enum(["active", "resolved"]),
  memoryEffects: z.array(memoryEffectSchema).optional(),
});

const weeklyStateSnapshotSchema = gameStatsSchema.extend({
  id: z.string().min(1),
  week: z.number().int().min(1),
  relationshipStage: relationshipStageSchema,
  settlementId: z.string().min(1),
});
const choiceHistoryRecordSchema = z.object({
  id: z.string().min(1),
  settlementId: z.string().min(1),
  week: z.number().int().min(1),
  eventId: z.string().min(1),
  choiceId: z.string().min(1),
  choiceText: z.string(),
  choiceTags: z.array(choiceTagSchema),
  isImportantRelationshipEvent: z.boolean(),
  beforeState: gameStatsSchema,
  afterState: gameStatsSchema,
  relationshipStageBefore: relationshipStageSchema,
  relationshipStageAfter: relationshipStageSchema,
});
const eventHistoryEntrySchema = z.object({
  recordId: z.string().min(1),
  eventId: z.string().min(1),
  week: z.number().int().min(1),
  category: eventCategorySchema,
  eventTags: z.array(eventTagSchema),
  outcomeTags: z.array(outcomeTagSchema),
  status: eventStatusSchema,
  settlementId: z.string().min(1).optional(),
  flagEffects: z.array(storyFlagEffectSchema),
});
const storyFlagsSchema = z.object({
  relationshipConfirmed: z.boolean(),
  formalBreakup: z.boolean(),
  majorExposureOccurred: z.boolean(),
  publicOpinionOutOfControl: z.boolean(),
  publicRevealEventTriggered: z.boolean(),
  publicRevealSucceeded: z.boolean(),
  unresolvedMajorCrisis: z.boolean(),
  separationPressureActive: z.boolean(),
  playerChoseLeave: z.boolean(),
  playerChoseSeparation: z.boolean(),
  forcedSeparation: z.boolean(),
  relationshipFailedDuringExposure: z.boolean(),
  playerCareerStable: z.boolean(),
});
const memoryRecordSchema = z.object({
  id: z.string().min(1),
  gameId: z.string().min(1),
  week: z.number().int().min(1),
  type: memoryTypeSchema,
  content: z.string().min(1),
  actors: z.array(entityIdSchema),
  tags: z.array(z.string()),
  importance: z.number().int().min(1).max(5),
  emotion: z.string().nullable(),
  visibility: memoryVisibilitySchema,
  knownBy: z.array(entityIdSchema),
  source: z.object({
    kind: z.enum(["event", "choice", "outcome"]),
    eventId: z.string().optional(),
    choiceId: z.string().optional(),
    settlementId: z.string().min(1),
  }),
  createdAtSequence: z.number().int().min(1),
});
const stateEffectsSchema = z.object({
  affection: effectMagnitudeSchema.optional(),
  popularity: effectMagnitudeSchema.optional(),
  mood: effectMagnitudeSchema.optional(),
  money: effectMagnitudeSchema.optional(),
  secrecy: effectMagnitudeSchema.optional(),
  companyAlert: effectMagnitudeSchema.optional(),
  careerPressure: effectMagnitudeSchema.optional(),
});
const storyChoiceSchema = z.object({
  id: z.enum(["A", "B", "C"]),
  text: z.string(),
  effects: stateEffectsSchema,
  tags: z.array(choiceTagSchema),
  outcome: structuredOutcomeSchema.optional(),
});
const generatedStorySchema = z.object({
  title: z.string().min(1),
  story: z.string().min(1),
  choices: z.array(z.object({ id: z.enum(["A", "B", "C"]), text: z.string().min(1) })).length(3),
  suggestedEffects: z.array(z.object({ stat: z.enum(["affection", "popularity", "mood", "money", "secrecy", "companyAlert", "careerPressure"]), magnitude: effectMagnitudeSchema, reason: z.string().min(1) })),
  suggestedChoiceTags: z.array(choiceTagSchema),
  suggestedOutcomeTags: z.array(outcomeTagSchema),
  memoryCandidates: z.array(z.object({
    type: z.enum(["short_term", "relationship", "long_term"]),
    summary: z.string().min(1),
    actors: z.array(entityIdSchema),
    tags: z.array(z.string()),
    importance: z.number().int().min(1).max(5),
  })),
});

export const gameSaveDataSchema = z.object({
  playerSetup: playerDraftSchema,
  gameState: gameStateSchema,
  eventHistory: z.array(eventHistoryEntrySchema),
  choiceHistory: z.array(choiceHistoryRecordSchema),
  weeklyStateHistory: z.array(weeklyStateSnapshotSchema),
  storyFlags: storyFlagsSchema,
  memories: z.array(memoryRecordSchema),
  processedSettlementIds: z.array(z.string().min(1)),
  runtime: z.object({
    playerConfirmed: z.boolean(),
    characterConfirmed: z.boolean(),
    entered: z.boolean(),
    storyIndex: z.number().int().min(0),
    previousChoice: storyChoiceSchema.nullable(),
    receipt: z.object({ label: z.string(), response: z.string() }).nullable(),
    selectedEventId: z.string().nullable(),
    selectedEventRecordId: z.string().nullable(),
    eventSeed: z.number().int().min(0),
    currentStory: generatedStorySchema.nullable().optional(),
    recentStoryOpenings: z.array(z.string().trim().min(1).max(160)).max(3).optional(),
  }),
});

export const gameSaveSchema = gameSaveDataSchema.extend({
  schemaVersion: z.literal(GAME_SAVE_SCHEMA_VERSION),
  saveId: z.string().min(1),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const saveSummarySchema = z.object({
  saveId: z.string().min(1),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  playerName: z.string().min(1),
  maleLead: characterIdSchema,
  week: z.number().int().min(1),
});

export const saveIndexSchema = z.array(saveSummarySchema);
export const saveEnvelopeSchema = z.object({ schemaVersion: z.number().int() }).passthrough();
