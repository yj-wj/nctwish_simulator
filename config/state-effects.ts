import type { CharacterBoundaryId, CharacterId } from "../types/character";
import type { GameStats, StatId } from "../types/game";
import type { EffectMagnitude } from "../types/state";

// GAME_SPEC does not define per-choice deltas. Phase 3C supplies one centralized,
// replaceable scale instead of embedding numbers in events or components.
export const effectMagnitudeValues: Record<EffectMagnitude, number> = {
  large_negative: -8,
  medium_negative: -5,
  small_negative: -2,
  none: 0,
  small_positive: 2,
  medium_positive: 5,
  large_positive: 8,
};

// Money uses the same magnitude language but a currency-sized unit.
export const statEffectScales: Record<StatId, number> = {
  affection: 1,
  popularity: 1,
  mood: 1,
  money: 100,
  secrecy: 1,
  companyAlert: 1,
  careerPressure: 1,
};

export const statBounds: Record<StatId, { min: number; max: number }> = {
  affection: { min: 0, max: 100 },
  popularity: { min: 0, max: 100 },
  mood: { min: 0, max: 100 },
  money: { min: 0, max: Number.MAX_SAFE_INTEGER },
  secrecy: { min: 0, max: 100 },
  companyAlert: { min: 0, max: 100 },
  careerPressure: { min: 0, max: 100 },
};

export const characterBoundaryEffectPolicy = {
  negativeAffectionMultiplier: 1.5,
  absoluteOverrides: {
    sakuya: {
      unfaithfulness: { mood: 0 },
    },
  } satisfies Partial<Record<CharacterId, Partial<Record<CharacterBoundaryId, Partial<GameStats>>>>>,
} as const;

