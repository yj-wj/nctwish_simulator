import type { AIRequestMetadata } from "../ai/provider";
import type { ChatGenerationInput, ChatGenerationOutput } from "../ai/chatSchemas";
import type { GameState } from "./game";
import type { ChoiceHistoryRecord, StoryFlagState, WeeklyStateSnapshot } from "./history";
import type { MemoryRecord } from "./memory";
import type { RuleEvaluation } from "./rules";
import type { StateChangeLogEntry, StateEffects } from "./state";
import type { EventHistoryEntry } from "./event";
import type { SanitizedEffects } from "./turn";
import type { WorldState } from "./world";
import type { SNSGenerationTrigger, SNSPost } from "./sns";

export type ChatMessageSource = "player" | "ai" | "system";
export type ChatTurnStatus = "idle" | "generating" | "validating" | "settling" | "completed" | "error";
export type ChatEffectCategory = "none" | "relationship" | "support" | "conflict";
export type IncomingMessageReason = "relationship_confirmed_follow_up" | "exposure_concern" | "career_pressure_check_in";
export type ChatBadcaseType = "character_voice_mismatch" | "intimacy_stage_mismatch" | "chat_too_verbose" | "repeated_response" | "rejected_chat_suggestion";

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  receiverId: string;
  content: string;
  week: number;
  sequence: number;
  source: ChatMessageSource;
  createdAt: string;
  turnId?: string;
  settlementId?: string;
}

export interface ChatThread {
  id: string;
  playerId: "player";
  participantId: string;
  unreadCount: number;
  lastReadSequence: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatTurnRecord {
  turnId: string;
  settlementId: string;
  threadId: string;
  week: number;
  effectCategory: ChatEffectCategory;
  meaningful: boolean;
  playerMessageId?: string;
  aiMessageIds: string[];
}

export interface IncomingMessageTrigger {
  id: string;
  threadId: string;
  senderId: string;
  reason: IncomingMessageReason;
  contextTags: string[];
  week: number;
  status: "pending" | "delivered";
}

export interface ChatDomainState {
  gameState: GameState;
  eventHistory: EventHistoryEntry[];
  choiceHistory: ChoiceHistoryRecord[];
  weeklyHistory: WeeklyStateSnapshot[];
  storyFlags: StoryFlagState;
  memories: MemoryRecord[];
  processedSettlementIds: string[];
  chatThreads: ChatThread[];
  chatMessages: ChatMessage[];
  chatTurns: ChatTurnRecord[];
  worldState: WorldState;
  snsPosts: SNSPost[];
  snsTriggers: SNSGenerationTrigger[];
}

export type ChatTurnInput =
  | { kind: "player_message"; threadId: string; content: string; turnId?: string }
  | { kind: "incoming"; trigger: IncomingMessageTrigger };

export interface ChatSettlementProposal {
  effects: SanitizedEffects;
  appliedEffects: StateEffects;
  effectCategory: ChatEffectCategory;
  spamLimited: boolean;
  acceptedChoiceTags: string[];
  rejectedChoiceTags: string[];
  acceptedOutcomeTags: string[];
  rejectedOutcomeTags: string[];
  memoryEffectsCount: number;
  rejectedMemories: Array<{ summary: string; reason: string }>;
}

export interface ChatTurnTrace {
  turnId: string;
  settlementId: string;
  input: ChatTurnInput;
  ruleEvaluation: RuleEvaluation;
  context: ChatGenerationInput;
  output: ChatGenerationOutput;
  proposal: ChatSettlementProposal;
  beforeState: GameState;
  afterState: GameState;
  metadata: AIRequestMetadata;
}

export interface ChatTurnResult {
  turnId: string;
  settlementId: string;
  gameState: GameState;
  eventHistory: EventHistoryEntry[];
  choiceHistory: ChoiceHistoryRecord[];
  weeklyHistory: WeeklyStateSnapshot[];
  storyFlags: StoryFlagState;
  memories: MemoryRecord[];
  processedSettlementIds: string[];
  chatThreads: ChatThread[];
  chatMessages: ChatMessage[];
  chatTurns: ChatTurnRecord[];
  stateChangeLog: StateChangeLogEntry | null;
  trace: ChatTurnTrace;
}
