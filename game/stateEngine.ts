import {
  characterBoundaryEffectPolicy,
  effectMagnitudeValues,
  statBounds,
  statEffectScales,
} from "../config/state-effects.ts";
import type { CharacterBoundaryId, CharacterId } from "../types/character.ts";
import type { GameState, GameStats, StatId } from "../types/game.ts";
import type { RuleEvaluation } from "../types/rules.ts";
import type {
  DebugStatePatch,
  EffectMagnitude,
  ResolvedStatEffect,
  StateEffectContext,
  StateEffects,
  StateEngineResult,
  StateModifierCode,
} from "../types/state.ts";
import { getRelationshipStage } from "./relationship.ts";

const statIds: StatId[] = [
  "affection",
  "popularity",
  "mood",
  "money",
  "secrecy",
  "companyAlert",
  "careerPressure",
];

function clampStat(stat: StatId, value: number): number {
  const { min, max } = statBounds[stat];
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function roundDelta(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

function hasCharacterBoundary(ruleEvaluation?: RuleEvaluation): boolean {
  return ruleEvaluation?.violatedRules.includes("characterBoundaryTriggered") ?? false;
}

function getAbsoluteBoundaryOverrides(
  gameState: GameState,
  ruleEvaluation?: RuleEvaluation,
): Partial<GameStats> {
  if (!ruleEvaluation) return {};
  const overrideConfig = characterBoundaryEffectPolicy.absoluteOverrides as Partial<
    Record<CharacterId, Partial<Record<CharacterBoundaryId, Partial<GameStats>>>>
  >;
  const characterRules = overrideConfig[gameState.maleLead];
  if (!characterRules) return {};
  return ruleEvaluation.matchedCharacterBoundaries.reduce<Partial<GameStats>>((result, boundary) => {
    const override = characterRules[boundary.id as CharacterBoundaryId];
    return override ? { ...result, ...override } : result;
  }, {});
}

function resolveEffects(
  gameState: GameState,
  effects: StateEffects,
  ruleEvaluation?: RuleEvaluation,
): { stats: GameStats; resolvedEffects: ResolvedStatEffect[]; modifiers: StateModifierCode[] } {
  const nextStats: GameStats = { ...gameState.stats };
  const resolvedEffects: ResolvedStatEffect[] = [];
  const modifiers: StateModifierCode[] = [];
  const boundaryTriggered = hasCharacterBoundary(ruleEvaluation);

  for (const stat of statIds) {
    const magnitude = effects[stat];
    if (!magnitude) continue;
    const baseDelta = effectMagnitudeValues[magnitude] * statEffectScales[stat];
    const modifier = stat === "affection" && baseDelta < 0 && boundaryTriggered
      ? characterBoundaryEffectPolicy.negativeAffectionMultiplier
      : 1;
    if (modifier !== 1) modifiers.push("characterBoundaryNegativeAffection");
    const appliedDelta = roundDelta(baseDelta * modifier);
    const before = nextStats[stat];
    const after = clampStat(stat, before + appliedDelta);
    nextStats[stat] = after;
    resolvedEffects.push({ stat, magnitude, baseDelta, modifier, appliedDelta: after - before, before, after });
  }

  const absoluteOverrides = getAbsoluteBoundaryOverrides(gameState, ruleEvaluation);
  for (const stat of statIds) {
    const override = absoluteOverrides[stat];
    if (override === undefined) continue;
    const before = nextStats[stat];
    const after = clampStat(stat, override);
    nextStats[stat] = after;
    const existing = resolvedEffects.find((effect) => effect.stat === stat);
    if (existing) {
      existing.appliedDelta += after - before;
      existing.after = after;
    } else {
      resolvedEffects.push({
        stat,
        magnitude: "none",
        baseDelta: 0,
        modifier: 1,
        appliedDelta: after - before,
        before,
        after,
      });
    }
    if (gameState.maleLead === "sakuya" && stat === "mood") {
      modifiers.push("sakuyaUnfaithfulnessMoodReset");
    }
  }

  return { stats: nextStats, resolvedEffects, modifiers: [...new Set(modifiers)] };
}

export function applyEffects(
  gameState: GameState,
  effects: StateEffects,
  ruleEvaluation?: RuleEvaluation,
): GameState {
  const resolution = resolveEffects(gameState, effects, ruleEvaluation);
  return { ...gameState, stats: resolution.stats };
}

export function settleChoice(
  gameState: GameState,
  effects: StateEffects,
  context: StateEffectContext,
): StateEngineResult {
  const before = { ...gameState.stats };
  const relationshipStageBefore = getRelationshipStage(before.affection);
  const resolution = resolveEffects(gameState, effects, context.ruleEvaluation);
  const updatedGameState: GameState = { ...gameState, stats: resolution.stats };
  const relationshipStageAfter = getRelationshipStage(updatedGameState.stats.affection);
  return {
    gameState: updatedGameState,
    changeLog: {
      week: gameState.week,
      eventId: context.eventId,
      choiceId: context.choiceId,
      before,
      effects: { ...effects },
      resolvedEffects: resolution.resolvedEffects,
      modifiers: resolution.modifiers,
      after: { ...updatedGameState.stats },
      relationshipStageBefore: relationshipStageBefore.id,
      relationshipStageAfter: relationshipStageAfter.id,
    },
  };
}

/** Development-only state setup still goes through the same boundary policy. */
export function setGameStateForDebug(gameState: GameState, patch: DebugStatePatch): GameState {
  const nextStats = { ...gameState.stats };
  for (const stat of statIds) {
    const value = patch.stats?.[stat];
    if (value !== undefined) nextStats[stat] = clampStat(stat, value);
  }
  const week = patch.week === undefined
    ? gameState.week
    : Math.max(1, Math.round(Number.isFinite(patch.week) ? patch.week : 1));
  return { ...gameState, week, stats: nextStats };
}

export function getEffectDelta(stat: StatId, magnitude: EffectMagnitude): number {
  return effectMagnitudeValues[magnitude] * statEffectScales[stat];
}
