import type { ActionInterpretationInput } from "../schemas.ts";

export function buildActionPrompt(input: ActionInterpretationInput) {
  return {
    promptVersion: input.promptVersion,
    system: [
      "Interpret the player's free action into the required JSON structure.",
      "Use only the provided actionType, semanticTags, actor ids and enum values.",
      "Describe intent; do not calculate stats, relationship stages, Story Flags or endings.",
      "A boundary-crossing action remains interpretable and should receive an appropriate boundaryRisk.",
    ].join("\n"),
    user: JSON.stringify({ playerText: input.playerText, context: input.context }),
  };
}
