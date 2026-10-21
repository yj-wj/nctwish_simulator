import type { EntityId } from "../types/memory.ts";
import type { StoryGenerationInput, StoryGenerationOutput } from "./schemas.ts";
import { storyGenerationOutputSchema } from "./schemas.ts";

export type NarrativeValidationWarning = "relationship_stage_mismatch";

export interface StoryValidationSuccess {
  success: true;
  data: StoryGenerationOutput;
  warnings: NarrativeValidationWarning[];
}

export interface StoryValidationFailure {
  success: false;
  message: "AI Output Validation Failed";
  issues: string[];
}

export type StoryValidationResult = StoryValidationSuccess | StoryValidationFailure;

function allowedActors(input: StoryGenerationInput): Set<EntityId | string> {
  return new Set([
    "player",
    input.context.maleLead.id,
    ...input.context.relevantMemories.flatMap(({ actors }) => actors),
  ]);
}

export function validateStoryOutput(raw: unknown, input: StoryGenerationInput): StoryValidationResult {
  const parsed = storyGenerationOutputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      message: "AI Output Validation Failed",
      issues: parsed.error.issues.map((issue) => {
        const path = issue.path.length ? issue.path.join(".") : "output";
        return `${path}: ${issue.message}`;
      }),
    };
  }

  const actors = allowedActors(input);
  const unknownActors = [...new Set(parsed.data.memoryCandidates
    .flatMap(({ actors: candidateActors }) => candidateActors)
    .filter((actor) => !actors.has(actor)))];
  if (unknownActors.length) {
    return {
      success: false,
      message: "AI Output Validation Failed",
      issues: unknownActors.map((actor) => `memoryCandidates.actors: unknown actor id '${actor}'.`),
    };
  }

  const warnings: NarrativeValidationWarning[] = [];
  if (
    input.context.gameState.relationshipStage === "strangers"
    && parsed.data.suggestedChoiceTags.includes("public_confession")
  ) warnings.push("relationship_stage_mismatch");

  return { success: true, data: parsed.data, warnings };
}

export function assertValidStoryOutput(raw: unknown, input: StoryGenerationInput): StoryGenerationOutput {
  const result = validateStoryOutput(raw, input);
  if (!result.success) throw new Error(`${result.message}: ${result.issues.join(" | ")}`);
  return result.data;
}
