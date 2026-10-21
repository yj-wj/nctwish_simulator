import { createInitialNPCStates } from "../config/npcs.ts";
import { worldTriggerPolicy } from "../config/world-triggers.ts";
import type { IncomingMessageReason, IncomingMessageTrigger } from "../types/chat.ts";
import type { CharacterId } from "../types/character.ts";
import type { SNSGenerationTrigger } from "../types/sns.ts";
import type { NPCId, NPCRelationshipState } from "../types/npc.ts";
import type { WorldEffectRecord, WorldSignal, WorldState, WorldTrigger, WorldTriggerType } from "../types/world.ts";
import type { MemoryEffect, MemoryRecord } from "../types/memory.ts";
import { addMemories } from "./memoryEngine.ts";

export function createInitialWorldState(): WorldState {
  return { npcStates: createInitialNPCStates(), triggers: [], processedTriggerIds: [], recentEffects: [] };
}

function unique<T>(values: T[]): T[] { return [...new Set(values)]; }

function triggerTypesFromSignal(signal: WorldSignal): WorldTriggerType[] {
  const outcomes = new Set(signal.outcomeTags ?? []);
  const choices = new Set(signal.choiceTags ?? []);
  const eventTags = new Set(signal.eventTags ?? []);
  const flags = signal.storyFlags ?? {};
  const types: WorldTriggerType[] = [];
  if (outcomes.has("relationship_confirmed") || flags.relationshipConfirmed) types.push("relationship_confirmed");
  if (outcomes.has("major_exposure") || flags.majorExposureOccurred) types.push("exposure_started");
  if (flags.publicOpinionOutOfControl) types.push("public_opinion_crisis");
  if (eventTags.has("company-intervention") || signal.eventCategory === "company") types.push("company_intervention");
  if (outcomes.has("career_breakdown")) types.push("career_breakdown");
  if (choices.has("temporary_distance") || outcomes.has("separation_pressure")) types.push("temporary_distance");
  if (signal.source === "chat" && outcomes.has("unstable_response")) types.push("major_argument");
  if (outcomes.has("financial_crisis")) types.push("financial_crisis");
  return unique(types);
}

export function deriveWorldTriggers(signal: WorldSignal): WorldTrigger[] {
  return triggerTypesFromSignal(signal).map((type) => {
    const policy = worldTriggerPolicy[type];
    return {
      id: `world:${signal.gameId}:${signal.source}:${signal.sourceId}:${type}`,
      type, week: signal.week, source: signal.source, sourceId: signal.sourceId,
      eventId: signal.eventId,
      actorIds: unique([...(signal.actorIds ?? ["player"]), ...policy.actorIds]),
      publicSummary: signal.publicSummary,
      tags: unique([...(signal.eventTags ?? []), ...(signal.outcomeTags ?? []), type]),
      status: "pending",
    };
  });
}

export function enqueueWorldTriggers(state: WorldState, triggers: WorldTrigger[]): WorldState {
  const known = new Set(state.triggers.map(({ id }) => id));
  const additions = triggers.filter(({ id }) => !known.has(id));
  return additions.length ? { ...state, triggers: [...state.triggers, ...additions] } : state;
}

function clampRelation(value: number): number { return Math.max(0, Math.min(100, value)); }

function relationDelta(type: WorldTriggerType, npcId: NPCId): Partial<NPCRelationshipState> {
  if (type === "company_intervention" && npcId === "npc:manager") return { tension: 12, trust: -3 };
  if (["exposure_started", "public_opinion_crisis"].includes(type) && npcId === "npc:fandom-friend") return { tension: 8 };
  if (["career_breakdown", "financial_crisis"].includes(type) && npcId === "npc:friend") return { closeness: 3, trust: 2 };
  if (type === "major_argument" && npcId === "npc:friend") return { tension: 6 };
  return {};
}

function incomingReason(type: WorldTriggerType): IncomingMessageReason | null {
  if (type === "relationship_confirmed") return "relationship_confirmed_follow_up";
  if (["exposure_started", "public_opinion_crisis"].includes(type)) return "exposure_concern";
  if (["company_intervention", "career_breakdown"].includes(type)) return "career_pressure_check_in";
  return null;
}

export interface ProcessWorldResult {
  worldState: WorldState;
  incomingMessageTriggers: IncomingMessageTrigger[];
  snsTriggers: SNSGenerationTrigger[];
  memories: MemoryRecord[];
}

export function processPendingWorldTriggers(
  state: WorldState,
  maleLead: CharacterId,
  incoming: IncomingMessageTrigger[],
  sns: SNSGenerationTrigger[],
  memoryInput?: { gameId: string; memories: MemoryRecord[] },
): ProcessWorldResult {
  const processed = new Set(state.processedTriggerIds);
  const incomingIds = new Set(incoming.map(({ id }) => id));
  const snsIds = new Set(sns.map(({ id }) => id));
  const addedIncoming: IncomingMessageTrigger[] = [];
  const addedSNS: SNSGenerationTrigger[] = [];
  const effects: WorldEffectRecord[] = [];
  let npcStates = state.npcStates.map((npc) => ({ ...npc, relationship: { ...npc.relationship }, knownBy: [...npc.knownBy] }));
  let memories = memoryInput?.memories ?? [];

  for (const trigger of state.triggers) {
    if (trigger.status === "processed" || processed.has(trigger.id)) continue;
    const policy = worldTriggerPolicy[trigger.type];
    npcStates = npcStates.map((npc) => {
      if (!policy.actorIds.includes(npc.npcId)) return npc;
      const delta = relationDelta(trigger.type, npc.npcId);
      return {
        ...npc, known: true, active: true,
        relationship: {
          trust: clampRelation(npc.relationship.trust + (delta.trust ?? 0)),
          closeness: clampRelation(npc.relationship.closeness + (delta.closeness ?? 0)),
          tension: clampRelation(npc.relationship.tension + (delta.tension ?? 0)),
        },
      };
    });
    const reason = incomingReason(trigger.type);
    if (policy.targets.includes("chat") && reason) {
      const id = `${trigger.id}:chat`;
      if (!incomingIds.has(id)) addedIncoming.push({
        id, threadId: `player:${maleLead}`, senderId: maleLead, reason,
        contextTags: [...trigger.tags], week: trigger.week, status: "pending",
      });
    }
    if (policy.targets.includes("sns") && ["exposure_started", "public_opinion_crisis"].includes(trigger.type)) {
      const id = `${trigger.id}:sns`;
      const sameSourceAlreadyQueued = sns.some((item) => item.sourceTurnId === trigger.sourceId);
      if (!snsIds.has(id) && !sameSourceAlreadyQueued) addedSNS.push({
        id, reason: trigger.type === "exposure_started" ? "exposure_leak" : "fandom_discussion",
        level: trigger.type === "exposure_started" ? "controversy" : "crisis",
        week: trigger.week, sourceEventId: trigger.eventId, sourceTurnId: trigger.sourceId,
        sourceCategory: "publicOpinion", sourceTags: ["sns", "fandom", "high-risk"],
        publicTitle: trigger.type === "exposure_started" ? "公开线索开始扩散" : "相关讨论持续升温",
        publicSummary: trigger.publicSummary ?? policy.summary, status: "pending",
      });
    }
    for (const target of policy.targets) effects.push({
      id: `${trigger.id}:${target}`, triggerId: trigger.id, triggerType: trigger.type,
      week: trigger.week, target, actorIds: trigger.actorIds, summary: policy.summary,
    });
    if (memoryInput && policy.targets.includes("memory")) {
      const effect: MemoryEffect = {
        key: `world-${trigger.type}`,
        type: trigger.type === "relationship_confirmed" ? "relationship" : "long_term",
        content: policy.summary,
        actors: trigger.actorIds,
        tags: [...trigger.tags, "world-trigger"],
        importance: ["exposure_started", "public_opinion_crisis", "company_intervention"].includes(trigger.type) ? 5 : 4,
        visibility: "shared",
        knownBy: trigger.actorIds,
        sourceKind: "outcome",
      };
      memories = addMemories(memories, [effect], {
        gameId: memoryInput.gameId, week: trigger.week, maleLeadId: maleLead,
        eventId: trigger.eventId ?? trigger.type, choiceId: trigger.type, settlementId: trigger.id,
      });
    }
    processed.add(trigger.id);
  }
  return {
    worldState: {
      npcStates,
      triggers: state.triggers.map((trigger) => processed.has(trigger.id) ? { ...trigger, status: "processed" } : trigger),
      processedTriggerIds: [...processed],
      recentEffects: [...state.recentEffects, ...effects].slice(-30),
    },
    incomingMessageTriggers: [...incoming, ...addedIncoming],
    snsTriggers: [...sns, ...addedSNS],
    memories,
  };
}

export function getPendingStoryEventIds(state: WorldState): string[] {
  return unique(state.triggers
    .filter(({ status }) => status === "pending")
    .flatMap(({ type }) => worldTriggerPolicy[type].storyEventIds));
}
