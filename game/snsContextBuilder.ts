import { snsGenerationInputSchema, type SNSGenerationInput } from "../ai/snsSchemas.ts";
import { SNS_POLICY, SNS_PROMPT_VERSION, SNS_REASON_POLICY } from "../config/sns.ts";
import { getCharacter } from "../config/characters/index.ts";
import type { SNSDomainState, SNSGenerationTrigger } from "../types/sns";

const publicStoryFlagIds = ["majorExposureOccurred", "publicOpinionOutOfControl", "publicRevealEventTriggered", "publicRevealSucceeded"] as const;

export function buildSNSContext(state: SNSDomainState, trigger: SNSGenerationTrigger): SNSGenerationInput {
  const character = getCharacter(state.gameState.maleLead);
  const policy = SNS_REASON_POLICY[trigger.reason];
  const recentPosts = [...state.snsPosts]
    .sort((left, right) => left.sequence - right.sequence)
    .slice(-SNS_POLICY.recentPostLimit)
    .map(({ accountType, content, sentiment }) => ({ accountType, content, sentiment }));
  const publicStoryFacts = publicStoryFlagIds.filter((id) => state.storyFlags[id]);
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
      recentPosts,
      diagnostics: {
        excludedHiddenMemories: state.memories.filter(({ visibility }) => visibility === "hidden").length,
        privateMemoryIncluded: false,
      },
    },
  });
}
