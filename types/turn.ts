import type { AIRequestMetadata } from "../ai/provider.ts";
import type { ActionInterpretationOutput, StoryGenerationInput, StoryGenerationOutput } from "../ai/schemas.ts";
import type { EndingCandidate } from "./ending.ts";
import type { EventEngineResult, EventHistoryEntry } from "./event.ts";
import type { GameState, StatId } from "./game.ts";
import type { ChoiceHistoryRecord, ChoiceTag, OutcomeTag, StoryFlagEffect, StoryFlagState, WeeklyStateSnapshot } from "./history.ts";
import type { MemoryEffect, MemoryRecord } from "./memory.ts";
import type { RuleEvaluation, StructuredPlayerAction } from "./rules.ts";
import type { EffectMagnitude, StateChangeLogEntry, StateEffects } from "./state.ts";

export type TurnStatus = "idle" | "interpreting" | "generating" | "validating" | "settling" | "completed" | "error";
export type TurnInputKind = "preset_choice" | "free_action";

export interface PresetTurnChoice {
  id: "A" | "B" | "C";
  text: string;
  tags: ChoiceTag[];
  effects: StateEffects;
}

export type TurnPlayerInput =
  | { kind: "preset_choice"; choice: PresetTurnChoice }
  | { kind: "free_action"; text: string };

export interface TurnDomainState {
  gameState: GameState;
  eventHistory: EventHistoryEntry[];
  choiceHistory: ChoiceHistoryRecord[];
  weeklyHistory: WeeklyStateSnapshot[];
  storyFlags: StoryFlagState;
  memories: MemoryRecord[];
  processedSettlementIds: string[];
  selectedEventId: string | null;
  selectedEventRecordId: string | null;
  eventSeed: number;
  /** Runtime-only narrative openings used to vary prose; never affects formal game rules. */
  recentStoryOpenings?: string[];
}

export type EffectRejectionReason =
  | "invalid_stat"
  | "invalid_magnitude"
  | "duplicate_stat"
  | "too_many_effects"
  | "rule_conflict";

export interface SuggestedEffectTrace {
  stat: string;
  magnitude: string;
  reason: string;
  source: "preset" | "ai";
}

export interface RejectedEffect extends SuggestedEffectTrace {
  rejectionReason: EffectRejectionReason;
}

export interface SettlementProposal {
  suggestedEffects: SuggestedEffectTrace[];
  acceptedEffects: StateEffects;
  rejectedEffects: RejectedEffect[];
  acceptedChoiceTags: ChoiceTag[];
  rejectedChoiceTags: string[];
  acceptedOutcomeTags: OutcomeTag[];
  rejectedOutcomeTags: string[];
  flagEffects: StoryFlagEffect[];
  memoryEffects: MemoryEffect[];
  rejectedMemories: Array<{ index: number; summary: string; reason: string }>;
}

export interface TurnTrace {
  turnId: string;
  settlementId: string;
  inputKind: TurnInputKind;
  playerInput: string;
  actionInterpretation: ActionInterpretationOutput | null;
  structuredAction: StructuredPlayerAction;
  ruleEvaluation: RuleEvaluation;
  storyContext: StoryGenerationInput;
  storyOutput: StoryGenerationOutput;
  settlementProposal: SettlementProposal;
  beforeState: GameState;
  afterState: GameState;
  relationshipStageBefore: string;
  relationshipStageAfter: string;
  endingCandidates: EndingCandidate[];
  actionMetadata: AIRequestMetadata | null;
  storyMetadata: AIRequestMetadata;
  totalTokens: number | null;
  totalLatencyMs: number;
}

export interface AIBadcaseRecord {
  turnId: string;
  model: string;
  playerAction: string;
  relationshipStage: string;
  errorType: string;
  validationErrors: string[];
  rejectedSuggestions: string[];
  occurredAt: string;
}

export interface TurnResult {
  turnId: string;
  settlementId: string;
  gameState: GameState;
  eventHistory: EventHistoryEntry[];
  choiceHistory: ChoiceHistoryRecord[];
  weeklyHistory: WeeklyStateSnapshot[];
  storyFlags: StoryFlagState;
  memories: MemoryRecord[];
  processedSettlementIds: string[];
  stateChangeLog: StateChangeLogEntry;
  eventEngineResult: EventEngineResult;
  selectedEventId: string | null;
  selectedEventRecordId: string | null;
  eventSeed: number;
  story: StoryGenerationOutput;
  trace: TurnTrace;
}

export interface RawSuggestedEffect {
  stat?: unknown;
  magnitude?: unknown;
  reason?: unknown;
  source?: "preset" | "ai";
}

export interface SanitizedEffects {
  effects: StateEffects;
  suggested: SuggestedEffectTrace[];
  rejected: RejectedEffect[];
}

export type TurnStatMagnitude = { stat: StatId; magnitude: EffectMagnitude };

