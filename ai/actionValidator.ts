import type { ActionInterpretationInput, ActionInterpretationOutput } from "./schemas.ts";
import { actionInterpretationOutputSchema } from "./schemas.ts";

export type ActionValidationResult =
  | { success: true; data: ActionInterpretationOutput }
  | { success: false; message: "AI Action Validation Failed"; issues: string[] };

export function validateActionInterpretationOutput(
  raw: unknown,
  input: ActionInterpretationInput,
): ActionValidationResult {
  const parsed = actionInterpretationOutputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      message: "AI Action Validation Failed",
      issues: parsed.error.issues.map((issue) => `${issue.path.join(".") || "output"}: ${issue.message}`),
    };
  }
  const knownActors = new Set(input.context.knownActorIds);
  const unknownActors = [...new Set(parsed.data.targetActorIds.filter((id) => !knownActors.has(id)))];
  if (unknownActors.length) {
    return {
      success: false,
      message: "AI Action Validation Failed",
      issues: unknownActors.map((id) => `targetActorIds: unknown actor id '${id}'.`),
    };
  }
  return { success: true, data: parsed.data };
}
