import type { MemoryType } from "../types/memory";

export const memoryImportanceRange = { min: 1, max: 5 } as const;

export const memoryRetrievalScoring = {
  actorMatch: 4,
  tagMatch: 3,
  importanceMultiplier: 2,
  recencyMax: 4,
  recencyWeeksPerPoint: 2,
  typeBonus: {
    short_term: 0,
    relationship: 2,
    long_term: 3,
    hidden: 1,
  } satisfies Record<MemoryType, number>,
} as const;

export const memoryTypeLabels: Record<MemoryType, string> = {
  short_term: "Short term",
  relationship: "Relationship",
  long_term: "Long term",
  hidden: "Hidden",
};
