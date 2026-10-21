import { STORY_PROMPT_VERSION, AI_CONTEXT_BUDGET, compactNarrativeRules } from "../config/ai.ts";
import { getCharacter } from "../config/characters/index.ts";
import { getFanLevel } from "../config/fan-levels.ts";
import { getGameMode } from "../config/game-modes.ts";
import { getPlayerIdentity } from "../config/identities.ts";
import { storyGenerationInputSchema, type StoryGenerationInput } from "../ai/schemas.ts";
import type { EventHistoryEntry, EventTemplate } from "../types/event.ts";
import type { GameState } from "../types/game.ts";
import type { StoryFlagState } from "../types/history.ts";
import type { EntityId, MemoryRecord } from "../types/memory.ts";
import type { RuleEvaluation, StructuredPlayerAction } from "../types/rules.ts";
import { getRelationshipStage } from "./relationship.ts";
import { getRelevantMemories, getVisibleMemories } from "./memoryEngine.ts";
import { evaluateAction } from "./ruleEngine.ts";

export interface BuildStoryContextOptions {
  gameState: GameState;
  currentEvent?: EventTemplate | null;
  eventHistory: EventHistoryEntry[];
  memories: MemoryRecord[];
  storyFlags: StoryFlagState;
  viewerId: EntityId;
  ruleEvaluation?: RuleEvaluation;
  playerAction?: StoryGenerationInput["playerAction"];
}

const neutralNarrativeAction: StructuredPlayerAction = {
  type: "politeConversation",
  romanticIntensity: "none",
  physicalIntimacy: "none",
  publicExposure: "none",
  professionalBoundary: "respected",
};

export function buildStoryGenerationInput(options: BuildStoryContextOptions): StoryGenerationInput {
  const { gameState, currentEvent = null, eventHistory, memories, storyFlags, viewerId } = options;
  const character = getCharacter(gameState.maleLead);
  const identity = getPlayerIdentity(gameState.player.identityId);
  const fanLevel = getFanLevel(gameState.player.fanLevelId);
  const gameMode = getGameMode(gameState.gameMode);
  const relationshipStage = getRelationshipStage(gameState.stats.affection);
  const rule = options.ruleEvaluation ?? evaluateAction(gameState, neutralNarrativeAction);
  const recentEvents = eventHistory
    .map((event, index) => ({ event, index }))
    .sort((left, right) => right.event.week - left.event.week || right.index - left.index)
    .slice(0, AI_CONTEXT_BUDGET.recentEvents)
    .map(({ event }) => ({
      recordId: event.recordId, eventId: event.eventId, week: event.week, category: event.category,
      tags: [...event.eventTags], outcomeTags: [...event.outcomeTags], status: event.status,
    }));
  const visibleMemories = getVisibleMemories(memories, viewerId);
  const scoredMemories = getRelevantMemories(memories, {
    currentWeek: gameState.week,
    viewerId,
    actors: [gameState.maleLead],
    tags: currentEvent?.tags,
    limit: AI_CONTEXT_BUDGET.relevantMemories,
  });
  const trueStoryFacts = Object.entries(storyFlags)
    .filter(([, value]) => value)
    .map(([id]) => id as keyof StoryFlagState);

  return storyGenerationInputSchema.parse({
    promptVersion: STORY_PROMPT_VERSION,
    context: {
      narrativeRules: [...compactNarrativeRules],
      player: {
        name: gameState.player.name,
        age: gameState.player.age,
        identity: {
          id: identity.id,
          name: gameState.player.identityId === "custom" && gameState.player.customIdentity
            ? gameState.player.customIdentity : identity.name,
          description: identity.description,
        },
        fanLevel: { id: fanLevel.id, name: fanLevel.name },
        gameMode: { id: gameMode.id, name: gameMode.name, description: gameMode.description },
      },
      maleLead: {
        id: character.id,
        name: character.name,
        displayName: character.displayName,
        publicPersona: character.publicPersona,
        privatePersona: character.privatePersona,
        traits: [...character.traits],
        romanceTaboos: character.romanceTaboos.map(({ id, title, description }) => ({ id, title, description })),
        behaviorConstraints: [...character.narrativeConstraints],
      },
      gameState: {
        week: gameState.week,
        scene: gameState.currentScene,
        careerStage: gameState.careerStage,
        relationshipStage: relationshipStage.id,
        stats: { ...gameState.stats },
      },
      event: currentEvent ? {
        id: currentEvent.id,
        category: currentEvent.category,
        title: currentEvent.title,
        description: currentEvent.description ?? null,
        tags: [...currentEvent.tags],
      } : null,
      ruleEvaluation: {
        allowedInteractionLevel: rule.relationshipRule.allowedInteractionLevel,
        riskLevel: rule.riskLevel,
        warnings: [...rule.warnings],
        matchedTriggers: rule.matchedTriggers.map(({ id }) => id),
        narrativeConstraints: [...rule.narrativeGuidance, ...rule.characterNarrativeConstraints],
        allowedInteractions: [...relationshipStage.allowedInteractions],
        prohibitedInteractions: [...relationshipStage.prohibitedInteractions],
      },
      storyFacts: trueStoryFacts,
      recentEvents,
      relevantMemories: scoredMemories.map(({ memory, score }) => ({
        id: memory.id,
        week: memory.week,
        type: memory.type,
        summary: memory.content,
        actors: [...memory.actors],
        tags: [...memory.tags],
        importance: memory.importance,
        score,
      })),
      diagnostics: {
        recentEventLimit: AI_CONTEXT_BUDGET.recentEvents,
        relevantMemoryLimit: AI_CONTEXT_BUDGET.relevantMemories,
        includedRecentEvents: recentEvents.length,
        excludedOlderEvents: Math.max(0, eventHistory.length - recentEvents.length),
        includedMemories: scoredMemories.length,
        excludedMemoriesByVisibility: Math.max(0, memories.length - visibleMemories.length),
        excludedMemoriesByLimit: Math.max(0, visibleMemories.length - scoredMemories.length),
      },
    },
    ...(options.playerAction ? { playerAction: options.playerAction } : {}),
  });
}
