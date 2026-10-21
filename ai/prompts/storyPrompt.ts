import type { StoryGenerationInput } from "../schemas.ts";

export type StoryPromptSectionId =
  | "SYSTEM_RULES"
  | "CONTINUITY_INSTRUCTIONS"
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
  const isFirstTurn = context.continuity.turnPhase === "new_game_first_turn";
  const recentOpeningReference = context.continuity.recentOpenings.length
    ? `Recent opening sentences to avoid repeating in structure or wording:\n${context.continuity.recentOpenings.map((opening, index) => `${index + 1}. ${opening}`).join("\n")}`
    : "No recent opening sentences are available.";
  return {
    promptVersion: input.promptVersion,
    sections: [
      {
        id: "SYSTEM_RULES",
        content: context.narrativeRules.join("\n"),
      },
      {
        id: "CONTINUITY_INSTRUCTIONS",
        content: [
          isFirstTurn
            ? "TURN PHASE: NEW GAME FIRST TURN ONLY. The source document's formal opening template may be used only as a style reference for this first turn. Its fixed location, time, weather, props, dialogue, and incident are not mandatory unless the current event context explicitly contains them."
            : "TURN PHASE: SUBSEQUENT TURN. Continue the scene directly; do not imitate the source document's formal first-turn opening template and do not restart the prose like a new novel chapter.",
          isFirstTurn
            ? "Establish the immediate playable situation efficiently, then move into the current event."
            : "CONTINUITY RULE: Begin with one of these: the player's just-completed action; an NPC's immediate reaction to it; unresolved dialogue, movement, or emotion from the previous turn; or a concrete change in the event already in progress.",
          "ANTI-REPETITION RULE: Do not use weather, season, sky, rain, wind, night, temperature, or general atmosphere as a default opening device. Environment may be emphasized only when it directly changes the player's action, directly changes the current event, or is an important component of the event itself.",
          "Environment is allowed when contextual and causal. Do not ban it entirely; avoid decorative weather openings that merely reset the scene.",
          "OPENING VARIATION: Vary openings across turns among action, dialogue, NPC reaction, phone message, a sound, a specific object, a task change, the player's physical or emotional response, or a relevant environmental change. Do not repeatedly use the same entry pattern.",
          recentOpeningReference,
        ].join("\n"),
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
