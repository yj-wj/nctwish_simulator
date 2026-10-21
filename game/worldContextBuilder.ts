import { getNPC } from "../config/npcs.ts";
import { worldTriggerPolicy } from "../config/world-triggers.ts";
import type { ChatTurnRecord } from "../types/chat.ts";
import type { EventHistoryEntry, EventTemplate } from "../types/event.ts";
import type { GameState } from "../types/game.ts";
import type { StoryFlagState } from "../types/history.ts";
import type { EntityId, MemoryRecord } from "../types/memory.ts";
import type { SNSGenerationTrigger, SNSPost } from "../types/sns.ts";
import type { EventWorldContext, UnifiedWorldContext, WorldState } from "../types/world.ts";
import { getVisibleMemories } from "./memoryEngine.ts";
import { getRelationshipStage } from "./relationship.ts";

export interface BuildWorldContextOptions {
  gameState: GameState;
  worldState: WorldState;
  storyFlags: StoryFlagState;
  eventHistory: EventHistoryEntry[];
  memories: MemoryRecord[];
  viewerId: EntityId;
  currentEvent?: EventTemplate | null;
  chatTurns?: ChatTurnRecord[];
  snsPosts?: SNSPost[];
  snsTriggers?: SNSGenerationTrigger[];
  publicOnly?: boolean;
}

function trueFlags(flags: StoryFlagState): Array<keyof StoryFlagState> {
  return Object.entries(flags).filter(([, value]) => value).map(([key]) => key as keyof StoryFlagState);
}

export function deriveActiveWorldCrises(options: Pick<BuildWorldContextOptions, "storyFlags" | "eventHistory">) {
  const active = options.eventHistory.filter(({ status }) => status === "active");
  const collect = (tags: string[]) => active.filter((event) => event.outcomeTags.some((tag) => tags.includes(tag))).map(({ recordId }) => recordId);
  const crises: UnifiedWorldContext["activeCrises"] = [];
  const exposure = collect(["major_exposure"]);
  if (exposure.length || options.storyFlags.majorExposureOccurred) crises.push({ id: "exposure", sourceIds: exposure });
  if (options.storyFlags.publicOpinionOutOfControl) crises.push({ id: "public_opinion", sourceIds: [] });
  const company = active.filter(({ category }) => category === "company").map(({ recordId }) => recordId);
  if (company.length) crises.push({ id: "company", sourceIds: company });
  const career = collect(["career_breakdown"]);
  if (career.length) crises.push({ id: "career", sourceIds: career });
  const financial = collect(["financial_crisis"]);
  if (financial.length) crises.push({ id: "financial", sourceIds: financial });
  const separation = collect(["separation_pressure"]);
  if (separation.length || options.storyFlags.separationPressureActive) crises.push({ id: "separation", sourceIds: separation });
  return crises;
}

export function buildWorldContext(options: BuildWorldContextOptions): UnifiedWorldContext {
  const participantIds = new Set(options.currentEvent?.actorIds ?? []);
  const publicOnly = options.publicOnly ?? false;
  const relevantNPCs = options.worldState.npcStates
    .filter((state) => state.known && (state.knownBy.includes(options.viewerId) || options.viewerId === options.gameState.maleLead))
    .filter((state) => state.active || participantIds.has(state.npcId))
    .slice(0, 4)
    .map((state) => {
      const definition = getNPC(state.npcId);
      return {
        id: definition.id, name: definition.name, role: definition.roleLabel,
        relationshipToPlayer: definition.relationshipToPlayer,
        personality: publicOnly ? [] : [...definition.personality],
        relationship: { ...state.relationship }, tags: [...definition.tags],
      };
    });
  const visible = getVisibleMemories(options.memories, options.viewerId)
    .filter((memory) => !publicOnly || memory.visibility !== "hidden")
    .slice(-6)
    .map(({ id, content, actors, tags, visibility }) => ({ id, content, actors, tags, visibility }));
  return {
    gameState: { week: options.gameState.week, scene: options.gameState.currentScene, careerStage: options.gameState.careerStage, stats: { ...options.gameState.stats } },
    relationshipStage: getRelationshipStage(options.gameState.stats.affection).id,
    storyFacts: trueFlags(options.storyFlags),
    currentEvent: options.currentEvent ? {
      id: options.currentEvent.id, category: options.currentEvent.category, title: options.currentEvent.title,
      actorIds: options.currentEvent.actorIds ?? [],
    } : null,
    relevantNPCs,
    activeCrises: deriveActiveWorldCrises(options),
    recentEventIds: options.eventHistory.slice(-4).map(({ eventId }) => eventId),
    relevantMemories: visible,
    recentChatOutcomes: (options.chatTurns ?? []).filter(({ meaningful }) => meaningful).slice(-3).map(({ effectCategory }) => effectCategory),
    recentSNSOutcomes: (options.snsTriggers ?? []).filter(({ status }) => status === "delivered").slice(-3).map(({ level }) => level),
    pendingTriggerTypes: options.worldState.triggers.filter(({ status }) => status === "pending").map(({ type }) => type),
  };
}

export function buildEventWorldContext(options: Omit<BuildWorldContextOptions, "viewerId" | "currentEvent">): EventWorldContext {
  const activeCrises = deriveActiveWorldCrises(options);
  const pending = options.worldState.triggers.filter(({ status }) => status === "pending");
  const storyEffectTypes = options.worldState.recentEffects
    .filter((effect) => effect.target === "story" && effect.week >= options.gameState.week - 1)
    .map(({ triggerType }) => triggerType);
  const triggerTypes = [...new Set([...pending.map(({ type }) => type), ...storyEffectTypes])];
  const pendingStoryEventIds = [...new Set(triggerTypes.flatMap((type) => worldTriggerPolicy[type].storyEventIds))];
  const latestSNSLevel = [...(options.snsTriggers ?? [])].reverse().find(({ status }) => status === "delivered")?.level ?? "normal";
  return {
    activeNpcIds: options.worldState.npcStates.filter(({ active }) => active).map(({ npcId }) => npcId),
    storyFlags: trueFlags(options.storyFlags),
    recentChatOutcomeTags: (options.chatTurns ?? []).filter(({ meaningful }) => meaningful).slice(-3).map(({ effectCategory }) => effectCategory),
    snsLevel: latestSNSLevel,
    activeCrisisIds: activeCrises.map(({ id }) => id),
    pendingTriggerTypes: triggerTypes,
    pendingStoryEventIds,
  };
}
