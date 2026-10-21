import type { StoryGenerationInput } from "../schemas.ts";

export type StoryPromptSectionId =
  | "SYSTEM_RULES"
  | "CHARACTER_INSTRUCTIONS"
  | "STATE_CONTEXT"
  | "MEMORY_CONTEXT"
  | "EVENT_CONTEXT"
  | "OUTPUT_INSTRUCTIONS";

export interface StoryPromptSection {
  id: StoryPromptSectionId;
  content: string;
}

export interface StoryPrompt {
  promptVersion: StoryGenerationInput["promptVersion"];
  sections: StoryPromptSection[];
}

export function buildStoryPrompt(input: StoryGenerationInput): StoryPrompt {
  const { context } = input;
  return {
    promptVersion: input.promptVersion,
    sections: [
      {
        id: "SYSTEM_RULES",
        content: context.narrativeRules.join("\n"),
      },
      {
        id: "CHARACTER_INSTRUCTIONS",
        content: JSON.stringify({
          player: context.player,
          maleLead: context.maleLead,
          relationshipStage: context.gameState.relationshipStage,
          ruleEvaluation: context.ruleEvaluation,
        }),
      },
      {
        id: "STATE_CONTEXT",
        content: JSON.stringify({ gameState: context.gameState, storyFacts: context.storyFacts }),
      },
      {
        id: "MEMORY_CONTEXT",
        content: JSON.stringify({ recentEvents: context.recentEvents, relevantMemories: context.relevantMemories }),
      },
      {
        id: "EVENT_CONTEXT",
        content: JSON.stringify({ event: context.event, playerAction: input.playerAction ?? null }),
      },
      {
        id: "OUTPUT_INSTRUCTIONS",
        content: [
          "Return only data matching StoryGenerationOutputSchema.",
          "Write narrative, three A/B/C choices, semantic effect suggestions and optional memory candidates.",
          "Suggestions never modify GameState, relationshipStage, Story Flags, Memory or endingId.",
          "Do not return finalAffection, finalRelationshipStage, relationshipConfirmed, endingId, or any final state field.",
        ].join("\n"),
      },
    ],
  };
}
