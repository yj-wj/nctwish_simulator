import type { EventHistoryEntry } from "./event";
import type { GameState, PlayerDraft } from "./game";
import type { ChoiceHistoryRecord, StoryFlagState, WeeklyStateSnapshot } from "./history";
import type { MemoryRecord } from "./memory";
import type { ActionReceipt, StoryChoice } from "./ui";
import type { StoryGenerationOutput } from "../ai/schemas";

export const GAME_SAVE_SCHEMA_VERSION = 1 as const;

export interface GameSaveRuntime {
  playerConfirmed: boolean;
  characterConfirmed: boolean;
  entered: boolean;
  storyIndex: number;
  previousChoice: StoryChoice | null;
  receipt: ActionReceipt | null;
  selectedEventId: string | null;
  selectedEventRecordId: string | null;
  eventSeed: number;
  /** Added in Phase 5C; optional keeps schema-version-1 saves backward compatible. */
  currentStory?: StoryGenerationOutput | null;
  /** Prompt-only continuity hints; optional keeps older schema-version-1 saves compatible. */
  recentStoryOpenings?: string[];
}

/** Authoritative persisted data. Derived ending and retrieval results are rebuilt after load. */
export interface GameSaveData {
  playerSetup: PlayerDraft;
  gameState: GameState;
  eventHistory: EventHistoryEntry[];
  choiceHistory: ChoiceHistoryRecord[];
  weeklyStateHistory: WeeklyStateSnapshot[];
  storyFlags: StoryFlagState;
  memories: MemoryRecord[];
  processedSettlementIds: string[];
  runtime: GameSaveRuntime;
}

export interface GameSave extends GameSaveData {
  schemaVersion: typeof GAME_SAVE_SCHEMA_VERSION;
  saveId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveSummary {
  saveId: string;
  createdAt: string;
  updatedAt: string;
  playerName: string;
  maleLead: GameState["maleLead"];
  week: number;
}

export type SaveLoadErrorCode =
  | "not_found"
  | "invalid_json"
  | "invalid_schema"
  | "unsupported_version"
  | "storage_unavailable";

