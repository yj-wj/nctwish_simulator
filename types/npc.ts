export type NPCType =
  | "bestFriendOrRoommate"
  | "fanFriend"
  | "childhoodFriendOrRival"
  | "mother"
  | "father"
  | "manager"
  | "industryRival"
  | "fandomKeyPerson";

import type { EntityId } from "./memory";
import type { CharacterId } from "./character";

export type NPCId =
  | "npc:friend"
  | "npc:fandom-friend"
  | "npc:childhood-friend"
  | "npc:mother"
  | "npc:father"
  | "npc:manager"
  | "npc:industry-rival"
  | "npc:fandom-key-person";

export type NPCKnowledgeScope =
  | "player_private"
  | "family_private"
  | "company_internal"
  | "industry_public"
  | "fandom_public"
  | "fandom_private";

export interface NPCDefinition {
  id: NPCId;
  name: string;
  role: NPCType;
  roleLabel: string;
  personality: string[];
  relationshipToPlayer: string;
  knowledgeScope: NPCKnowledgeScope[];
  tags: string[];
  enabled: boolean;
  publicDescription: string;
  narrativeConstraints: string[];
}

export interface NPCRelationshipState {
  trust: number;
  closeness: number;
  tension: number;
}

export interface NPCState {
  npcId: NPCId;
  known: boolean;
  active: boolean;
  relationship: NPCRelationshipState;
  knownBy: EntityId[];
}

export interface CurrentMaleLeadActor {
  id: CharacterId;
  name: string;
  role: "currentMaleLead";
  personality: string[];
  relationshipToPlayer: string;
  knowledgeScope: ["shared"];
  tags: string[];
  enabled: true;
}

export type WorldActorDefinition = CurrentMaleLeadActor | NPCDefinition;

