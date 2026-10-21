import { relationshipStageConfig } from "../config/relationship-stages.ts";
import type { RelationshipStage } from "../types/game.ts";

export function getRelationshipStage(affection: number): RelationshipStage {
  if (!Number.isFinite(affection) || affection < 0 || affection > 100) {
    throw new RangeError("affection must be a finite number between 0 and 100.");
  }

  const stage = relationshipStageConfig.find(
    ({ minAffection, maxAffection }) => affection >= minAffection && affection <= maxAffection,
  );

  if (!stage) {
    throw new RangeError(`No relationship stage is configured for affection ${affection}.`);
  }

  return stage;
}

