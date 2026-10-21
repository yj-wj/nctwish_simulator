import { z } from "zod";

export interface QwenJSONSchemaFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: true;
    schema: Record<string, unknown>;
  };
}

function removeUnsupportedAnnotations(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(removeUnsupportedAnnotations);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => key !== "$schema" && key !== "default")
    .map(([key, child]) => [key, removeUnsupportedAnnotations(child)]));
}

export function createQwenJSONSchema(
  name: string,
  schema: z.ZodType,
): QwenJSONSchemaFormat {
  return {
    type: "json_schema",
    json_schema: {
      name,
      strict: true,
      schema: removeUnsupportedAnnotations(z.toJSONSchema(schema)) as Record<string, unknown>,
    },
  };
}
