import type { EventCategory, EventTag } from "./event";
import type { StoryFlagState } from "./history";
import type { EntityId, MemoryRecord } from "./memory";
import type { NPCId, NPCState } from "./npc";
import type { RelationshipStageId } from "./game";

export type WorldTriggerType =
  | "relationship_confirmed"
  | "exposure_started"
  | "public_opinion_crisis"
  | "company_intervention"
  | "career_breakdown"
  | "temporary_distance"
  | "major_argument"
  | "financial_crisis";

export type WorldTriggerStatus = "pending" | "processed";
export type WorldTriggerSource = "story" | "chat" | "sns" | "fixture";
export type WorldEffectTarget = "story" | "chat" | "sns" | "memory";

export interface WorldTrigger {
  id: string;
  type: WorldTriggerType;
  week: number;
  source: WorldTriggerSource;
  sourceId: string;
  eventId?: string;
  actorIds: EntityId[];
  publicSummary?: string;
  tags: string[];
  status: WorldTriggerStatus;
}

export interface WorldEffectRecord {
  id: string;
  triggerId: string;
  triggerType: WorldTriggerType;
  week: number;
  target: WorldEffectTarget;
  actorIds: EntityId[];
  summary: string;
}

export interface WorldState {
  npcStates: NPCState[];
  triggers: WorldTrigger[];
  processedTriggerIds: string[];
  recentEffects: WorldEffectRecord[];
}

export interface ActiveWorldCrisis {
  id: "exposure" | "public_opinion" | "company" | "career" | "financial" | "separation";
  sourceIds: string[];
}

export interface WorldContextNPC {
  id: NPCId;
  name: string;
  role: string;
  relationshipToPlayer: string;
  personality: string[];
  relationship: NPCState["relationship"];
  tags: string[];
}

export interface UnifiedWorldContext {
  gameState: { week: number; scene: string; careerStage: string; stats: import("./game").GameStats };
  relationshipStage: RelationshipStageId;
  storyFacts: Array<keyof StoryFlagState>;
  currentEvent: { id: string; category: EventCategory; title: string; actorIds: EntityId[] } | null;
  relevantNPCs: WorldContextNPC[];
  activeCrises: ActiveWorldCrisis[];
  recentEventIds: string[];
  relevantMemories: Pick<MemoryRecord, "id" | "content" | "actors" | "tags" | "visibility">[];
  recentChatOutcomes: string[];
  recentSNSOutcomes: string[];
  pendingTriggerTypes: WorldTriggerType[];
}

export interface EventWorldContext {
  activeNpcIds: NPCId[];
  storyFlags: Array<keyof StoryFlagState>;
  recentChatOutcomeTags: string[];
  snsLevel: "normal" | "attention" | "rumor" | "controversy" | "crisis";
  activeCrisisIds: ActiveWorldCrisis["id"][];
  pendingTriggerTypes: WorldTriggerType[];
  pendingStoryEventIds: string[];
}

export interface WorldSignal {
  gameId: string;
  week: number;
  source: WorldTriggerSource;
  sourceId: string;
  eventId?: string;
  eventCategory?: EventCategory;
  eventTags?: EventTag[];
  outcomeTags?: string[];
  choiceTags?: string[];
  storyFlags?: Partial<StoryFlagState>;
  actorIds?: EntityId[];
  publicSummary?: string;
}
