import { chatGenerationInputSchema, type ChatGenerationInput } from "../ai/chatSchemas.ts";
import { CHAT_POLICY, CHAT_PROMPT_VERSION } from "../config/chat.ts";
import { getCharacter } from "../config/characters/index.ts";
import { getPlayerIdentity } from "../config/identities.ts";
import type { ChatDomainState, ChatTurnInput } from "../types/chat.ts";
import type { RuleEvaluation } from "../types/rules.ts";
import { getRelationshipStage } from "./relationship.ts";
import { getRelevantMemories, getVisibleMemories } from "./memoryEngine.ts";

export function buildChatContext(
  state: ChatDomainState,
  input: ChatTurnInput,
  ruleEvaluation: RuleEvaluation,
): ChatGenerationInput {
  const { gameState } = state;
  const character = getCharacter(gameState.maleLead);
  const identity = getPlayerIdentity(gameState.player.identityId);
  const threadId = input.kind === "player_message" ? input.threadId : input.trigger.threadId;
  const recentMessages = state.chatMessages
    .filter((message) => message.threadId === threadId)
    .sort((left, right) => left.sequence - right.sequence)
    .slice(-CHAT_POLICY.recentMessageLimit)
    .map(({ senderId, content, sequence }) => ({ senderId, content, sequence }));
  const visibleMemories = getVisibleMemories(state.memories, gameState.maleLead);
  const relevantMemories = getRelevantMemories(state.memories, {
    currentWeek: gameState.week,
    viewerId: gameState.maleLead,
    actors: ["player", gameState.maleLead],
    memoryTypes: ["relationship", "long_term", "short_term"],
    limit: CHAT_POLICY.relevantMemoryLimit,
  });
  const storyFacts = Object.entries(state.storyFlags).filter(([, value]) => value).map(([key]) => key);

  return chatGenerationInputSchema.parse({
    promptVersion: CHAT_PROMPT_VERSION,
    mode: input.kind === "incoming" ? "incoming" : "reply",
    playerMessage: input.kind === "player_message" ? input.content.trim() : null,
    incomingReason: input.kind === "incoming" ? input.trigger.reason : null,
    context: {
      threadId,
      player: {
        name: gameState.player.name,
        age: gameState.player.age,
        identity: gameState.player.identityId === "custom" && gameState.player.customIdentity
          ? gameState.player.customIdentity : identity.name,
      },
      maleLead: {
        id: character.id,
        name: character.name,
        displayName: character.displayName,
        publicPersona: character.publicPersona,
        privatePersona: character.privatePersona,
        traits: [...character.traits],
        romanceTaboos: character.romanceTaboos.map(({ title, description }) => ({ title, description })),
        narrativeConstraints: [...character.narrativeConstraints],
      },
      gameState: {
        week: gameState.week,
        relationshipStage: getRelationshipStage(gameState.stats.affection).id,
        mood: gameState.stats.mood,
        secrecy: gameState.stats.secrecy,
        companyAlert: gameState.stats.companyAlert,
        careerPressure: gameState.stats.careerPressure,
      },
      storyFacts,
      recentMessages,
      relevantMemories: relevantMemories.map(({ memory }) => ({
        id: memory.id,
        summary: memory.content,
        type: memory.type,
        importance: memory.importance,
      })),
      ruleEvaluation: {
        riskLevel: ruleEvaluation.riskLevel,
        allowedInteractionLevel: ruleEvaluation.relationshipRule.allowedInteractionLevel,
        warnings: [...ruleEvaluation.warnings],
        violatedRules: [...ruleEvaluation.violatedRules],
        narrativeConstraints: [...ruleEvaluation.narrativeGuidance, ...ruleEvaluation.characterNarrativeConstraints],
      },
      diagnostics: {
        recentMessagesCount: recentMessages.length,
        relevantMemoriesCount: relevantMemories.length,
        excludedHiddenMemories: Math.max(0, state.memories.length - visibleMemories.length),
      },
    },
  });
}
