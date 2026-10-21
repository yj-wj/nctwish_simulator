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
  actorIds: z.array(entityIdSchema).optional(),
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
const chatMessageSchema = z.object({
  id: z.string().min(1), threadId: z.string().min(1), senderId: z.string().min(1), receiverId: z.string().min(1),
  content: z.string().min(1), week: z.number().int().min(1), sequence: z.number().int().min(1),
  source: z.enum(["player", "ai", "system"]), createdAt: z.iso.datetime(), turnId: z.string().optional(), settlementId: z.string().optional(),
});
const chatThreadSchema = z.object({
  id: z.string().min(1), playerId: z.literal("player"), participantId: z.string().min(1), unreadCount: z.number().int().nonnegative(),
  lastReadSequence: z.number().int().nonnegative(), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
});
const chatTurnSchema = z.object({
  turnId: z.string().min(1), settlementId: z.string().min(1), threadId: z.string().min(1), week: z.number().int().min(1),
  effectCategory: z.enum(["none", "relationship", "support", "conflict"]), meaningful: z.boolean(),
  playerMessageId: z.string().optional(), aiMessageIds: z.array(z.string().min(1)),
});
const incomingMessageTriggerSchema = z.object({
  id: z.string().min(1), threadId: z.string().min(1), senderId: z.string().min(1),
  reason: z.enum(["relationship_confirmed_follow_up", "exposure_concern", "career_pressure_check_in"]),
  contextTags: z.array(z.string()), week: z.number().int().min(1), status: z.enum(["pending", "delivered"]),
});
const snsAccountTypeSchema = z.enum(["official", "company", "media", "fansite", "fan", "anonymous"]);
const snsPostTagSchema = z.enum(["official", "performance", "airport", "fandom", "relationship_rumor", "exposure", "company", "privacy", "career"]);
const snsReasonSchema = z.enum(["performance_buzz", "airport_sighting", "fandom_discussion", "company_statement", "relationship_rumor", "exposure_leak", "paparazzi_exposure", "popularity_spike"]);
const snsLevelSchema = z.enum(["normal", "attention", "rumor", "controversy", "crisis"]);
const snsPostSchema = z.object({
  id: z.string().min(1), authorId: z.string().min(1), authorName: z.string().min(1), handle: z.string().min(1), accountType: snsAccountTypeSchema,
  content: z.string().min(1), week: z.number().int().min(1), sequence: z.number().int().min(1), tags: z.array(snsPostTagSchema),
  visibility: z.enum(["public", "fandom"]), sentiment: z.enum(["positive", "neutral", "mixed", "negative"]),
  reactions: z.object({ likes: z.number().int().nonnegative(), reposts: z.number().int().nonnegative(), comments: z.number().int().nonnegative(), heat: z.number().int().nonnegative() }),
  sourceTriggerId: z.string().min(1), sourceEventId: z.string().optional(), sourceTurnId: z.string().optional(), read: z.boolean(), createdAt: z.iso.datetime(),
});
const snsTriggerSchema = z.object({
  id: z.string().min(1), reason: snsReasonSchema, level: snsLevelSchema, week: z.number().int().min(1),
  sourceEventId: z.string().optional(), sourceTurnId: z.string().optional(), sourceCategory: eventCategorySchema,
  sourceTags: z.array(eventTagSchema), publicTitle: z.string().min(1), publicSummary: z.string().min(1),
  status: z.enum(["pending", "processing", "delivered"]),
});
const npcIdSchema = z.enum(["npc:friend", "npc:fandom-friend", "npc:childhood-friend", "npc:mother", "npc:father", "npc:manager", "npc:industry-rival", "npc:fandom-key-person"]);
const worldTriggerTypeSchema = z.enum(["relationship_confirmed", "exposure_started", "public_opinion_crisis", "company_intervention", "career_breakdown", "temporary_distance", "major_argument", "financial_crisis"]);
const worldTriggerSchema = z.object({
  id: z.string().min(1), type: worldTriggerTypeSchema, week: z.number().int().min(1),
  source: z.enum(["story", "chat", "sns", "fixture"]), sourceId: z.string().min(1), eventId: z.string().optional(),
  actorIds: z.array(entityIdSchema), publicSummary: z.string().optional(), tags: z.array(z.string()), status: z.enum(["pending", "processed"]),
});
const worldStateSchema = z.object({
  npcStates: z.array(z.object({
    npcId: npcIdSchema, known: z.boolean(), active: z.boolean(),
    relationship: z.object({ trust: z.number().min(0).max(100), closeness: z.number().min(0).max(100), tension: z.number().min(0).max(100) }),
    knownBy: z.array(entityIdSchema),
  })),
  triggers: z.array(worldTriggerSchema),
  processedTriggerIds: z.array(z.string().min(1)),
  recentEffects: z.array(z.object({
    id: z.string().min(1), triggerId: z.string().min(1), triggerType: worldTriggerTypeSchema,
    week: z.number().int().min(1), target: z.enum(["story", "chat", "sns", "memory"]),
    actorIds: z.array(entityIdSchema), summary: z.string().min(1),
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
  chatThreads: z.array(chatThreadSchema),
  chatMessages: z.array(chatMessageSchema),
  chatTurns: z.array(chatTurnSchema),
  incomingMessageTriggers: z.array(incomingMessageTriggerSchema),
  snsPosts: z.array(snsPostSchema),
  snsTriggers: z.array(snsTriggerSchema),
  worldState: worldStateSchema,
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
