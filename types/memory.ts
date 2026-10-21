import type { CharacterId } from "./character";

export type EntityId = "player" | CharacterId | `npc:${string}`;
export type MemoryEntityRef = EntityId | "current_male_lead";

export type MemoryType = "short_term" | "long_term" | "relationship" | "hidden";
export type MemoryVisibility = "player_known" | "shared" | "hidden";
export type MemoryImportance = 1 | 2 | 3 | 4 | 5;

export interface MemorySource {
  kind: "event" | "choice" | "outcome";
  eventId?: string;
  choiceId?: string;
  settlementId: string;
}

export interface MemoryRecord {
  id: string;
  gameId: string;
  week: number;
  type: MemoryType;
  content: string;
  actors: EntityId[];
  tags: string[];
  importance: MemoryImportance;
  emotion: string | null;
  visibility: MemoryVisibility;
  knownBy: EntityId[];
  source: MemorySource;
  createdAtSequence: number;
}

export interface MemoryEffect {
  key: string;
  type: MemoryType;
  content: string;
  actors: MemoryEntityRef[];
  tags: string[];
  importance: MemoryImportance;
  emotion?: string | null;
  visibility: MemoryVisibility;
  knownBy: MemoryEntityRef[];
  sourceKind?: MemorySource["kind"];
}

export interface MemoryWriteContext {
  gameId: string;
  week: number;
  maleLeadId: CharacterId;
  eventId: string;
  choiceId: string;
  settlementId: string;
}

export interface MemoryRetrievalQuery {
  currentWeek: number;
  viewerId: EntityId;
  actors?: EntityId[];
  tags?: string[];
  memoryTypes?: MemoryType[];
  visibility?: MemoryVisibility[];
  limit?: number;
}

export interface MemoryScoreBreakdown {
  actorMatch: number;
  tagMatch: number;
  importance: number;
  recency: number;
  memoryType: number;
}

export interface ScoredMemory {
  memory: MemoryRecord;
  score: number;
  breakdown: MemoryScoreBreakdown;
}
