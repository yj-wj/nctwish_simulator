import { snsGenerationInputSchema, type SNSGenerationInput } from "../ai/snsSchemas.ts";
import { SNS_POLICY, SNS_PROMPT_VERSION, SNS_REASON_POLICY } from "../config/sns.ts";
import { getCharacter } from "../config/characters/index.ts";
import type { SNSDomainState, SNSGenerationTrigger } from "../types/sns.ts";
import { buildWorldContext } from "./worldContextBuilder.ts";
import { createInitialWorldState } from "./worldEngine.ts";

const publicStoryFlagIds = ["majorExposureOccurred", "publicOpinionOutOfControl", "publicRevealEventTriggered", "publicRevealSucceeded"] as const;

export function buildSNSContext(state: SNSDomainState, trigger: SNSGenerationTrigger): SNSGenerationInput {
  const character = getCharacter(state.gameState.maleLead);
  const policy = SNS_REASON_POLICY[trigger.reason];
  const recentPosts = [...state.snsPosts]
    .sort((left, right) => left.sequence - right.sequence)
    .slice(-SNS_POLICY.recentPostLimit)
    .map(({ accountType, content, sentiment }) => ({ accountType, content, sentiment }));
  const publicStoryFacts = publicStoryFlagIds.filter((id) => state.storyFlags[id]);
  const world = buildWorldContext({
    gameState: state.gameState,
    worldState: state.worldState ?? createInitialWorldState(),
    storyFlags: state.storyFlags,
    eventHistory: state.eventHistory,
    memories: state.memories,
    viewerId: "player",
    chatTurns: state.chatTurns ?? [],
    snsPosts: state.snsPosts,
    snsTriggers: state.snsTriggers,
    publicOnly: true,
  });
  const publicWorld = {
    storyFacts: world.storyFacts.filter((id): id is (typeof publicStoryFlagIds)[number] => publicStoryFlagIds.includes(id as (typeof publicStoryFlagIds)[number])),
    relevantNPCs: world.relevantNPCs.map(({ id, name, role, tags }) => ({ id, name, role, tags })),
    activeCrises: world.activeCrises,
    recentEventIds: world.recentEventIds,
    recentSNSOutcomes: world.recentSNSOutcomes,
    pendingTriggerTypes: world.pendingTriggerTypes,
  };
  return snsGenerationInputSchema.parse({
    promptVersion: SNS_PROMPT_VERSION,
    context: {
      trigger: {
        id: trigger.id, reason: trigger.reason, level: trigger.level, week: trigger.week,
        publicTitle: trigger.publicTitle, publicSummary: trigger.publicSummary,
        sourceEventId: trigger.sourceEventId ?? null, sourceCategory: trigger.sourceCategory,
        sourceTags: trigger.sourceTags, allowedAccountTypes: policy.allowedAccounts, allowedTopicTags: policy.defaultTags,
      },
      maleLead: { id: character.id, displayName: character.displayName, publicPersona: character.publicPersona },
      publicState: {
        popularity: state.gameState.stats.popularity,
        companyAlert: state.gameState.stats.companyAlert,
        careerPressure: state.gameState.stats.careerPressure,
      },
      publicStoryFacts,
      world: publicWorld,
      recentPosts,
      diagnostics: {
        excludedHiddenMemories: state.memories.filter(({ visibility }) => visibility === "hidden").length,
        privateMemoryIncluded: false,
      },
    },
  });
}
