import type { AIRequestMetadata } from "../ai/provider";
import type { SNSGenerationInput, SNSGenerationOutput } from "../ai/snsSchemas";
import type { EventCategory, EventHistoryEntry, EventTag } from "./event";
import type { GameState } from "./game";
import type { ChoiceHistoryRecord, StoryFlagState, WeeklyStateSnapshot } from "./history";
import type { MemoryRecord } from "./memory";
import type { RuleEvaluation } from "./rules";
import type { StateChangeLogEntry, StateEffects } from "./state";
import type { WorldState } from "./world";
import type { ChatTurnRecord } from "./chat";

export type SNSAccountType = "official" | "company" | "media" | "fansite" | "fan" | "anonymous";
export type SNSSentiment = "positive" | "neutral" | "mixed" | "negative";
export type SNSVisibility = "public" | "fandom";
export type SNSOpinionLevel = "normal" | "attention" | "rumor" | "controversy" | "crisis";
export type SNSPostTag = "official" | "performance" | "airport" | "fandom" | "relationship_rumor" | "exposure" | "company" | "privacy" | "career";
export type SNSTriggerReason = "performance_buzz" | "airport_sighting" | "fandom_discussion" | "company_statement" | "relationship_rumor" | "exposure_leak" | "paparazzi_exposure" | "popularity_spike";
export type SNSTriggerStatus = "pending" | "processing" | "delivered";
export type SNSGenerationStatus = "idle" | "generating" | "validating" | "settling" | "completed" | "error";

export interface SNSReactionInfo {
  likes: number;
  reposts: number;
  comments: number;
  heat: number;
}

export interface SNSPost {
  id: string;
  authorId: string;
  authorName: string;
  handle: string;
  accountType: SNSAccountType;
  content: string;
  week: number;
  sequence: number;
  tags: SNSPostTag[];
  visibility: SNSVisibility;
  sentiment: SNSSentiment;
  reactions: SNSReactionInfo;
  sourceTriggerId: string;
  sourceEventId?: string;
  sourceTurnId?: string;
  read: boolean;
  createdAt: string;
}

export interface SNSGenerationTrigger {
  id: string;
  reason: SNSTriggerReason;
  level: SNSOpinionLevel;
  week: number;
  sourceEventId?: string;
  sourceTurnId?: string;
  sourceCategory: EventCategory;
  sourceTags: EventTag[];
  publicTitle: string;
  publicSummary: string;
  status: SNSTriggerStatus;
}

export interface SNSDomainState {
  gameState: GameState;
  eventHistory: EventHistoryEntry[];
  choiceHistory: ChoiceHistoryRecord[];
  weeklyHistory: WeeklyStateSnapshot[];
  storyFlags: StoryFlagState;
  memories: MemoryRecord[];
  processedSettlementIds: string[];
  snsPosts: SNSPost[];
  snsTriggers: SNSGenerationTrigger[];
  worldState: WorldState;
  chatTurns: ChatTurnRecord[];
}

export interface SNSPostRejection {
  index: number;
  reason: "account_policy_mismatch" | "visibility_policy_mismatch" | "duplicate_content";
  content: string;
}

export interface SNSTurnTrace {
  trigger: SNSGenerationTrigger;
  ruleEvaluation: RuleEvaluation;
  context: SNSGenerationInput;
  output: SNSGenerationOutput;
  acceptedPostCount: number;
  rejectedPosts: SNSPostRejection[];
  appliedEffects: StateEffects;
  beforeState: GameState;
  afterState: GameState;
  memoryWritten: boolean;
  metadata: AIRequestMetadata;
}

export interface SNSTurnResult {
  settlementId: string;
  gameState: GameState;
  eventHistory: EventHistoryEntry[];
  choiceHistory: ChoiceHistoryRecord[];
  weeklyHistory: WeeklyStateSnapshot[];
  storyFlags: StoryFlagState;
  memories: MemoryRecord[];
  processedSettlementIds: string[];
  snsPosts: SNSPost[];
  snsTriggers: SNSGenerationTrigger[];
  stateChangeLog: StateChangeLogEntry;
  trace: SNSTurnTrace;
}
