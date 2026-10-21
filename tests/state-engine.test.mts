import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateAction } from "../game/ruleEngine.ts";
import { applyEffects, getEffectDelta, settleChoice } from "../game/stateEngine.ts";
import { getRelationshipStage } from "../game/relationship.ts";
import type { GameState, GameStats } from "../types/game.ts";
import type { StructuredPlayerAction } from "../types/rules.ts";

const baseStats: GameStats = {
  affection: 49,
  popularity: 10,
  mood: 60,
  money: 2300,
  secrecy: 80,
  companyAlert: 30,
  careerPressure: 50,
};

function makeState(stats: Partial<GameStats> = {}, maleLead: GameState["maleLead"] = "sion"): GameState {
  return {
    gameId: "state-test",
    week: 12,
    currentScene: "测试场景",
    careerStage: "回归期",
    player: { name: "测试玩家", age: 24, identityId: "student", fanLevelId: "passerby" },
    maleLead,
    gameMode: "standard",
    stats: { ...baseStats, ...stats },
  };
}

function tabooAction(signal: NonNullable<StructuredPlayerAction["characterBoundarySignals"]>[number]): StructuredPlayerAction {
  return {
    type: "other",
    romanticIntensity: "none",
    physicalIntimacy: "none",
    publicExposure: "none",
    professionalBoundary: "respected",
    characterBoundarySignals: [signal],
  };
}

test("Case A: medium positive affection crosses into ambiguous stage", () => {
  const original = makeState({ affection: 49 });
  const before = structuredClone(original);
  const result = settleChoice(original, { affection: "medium_positive" }, { eventId: "mock", choiceId: "B" });
  assert.equal(result.gameState.stats.affection, 54);
  assert.equal(getRelationshipStage(result.gameState.stats.affection).name, "暧昧期");
  assert.equal(result.changeLog.relationshipStageBefore, "interested");
  assert.equal(result.changeLog.relationshipStageAfter, "ambiguous");
  assert.deepEqual(original, before, "State Engine must not mutate the original GameState");
});

test("Cases B and C: percentage stats stay within 0–100", () => {
  assert.equal(applyEffects(makeState({ affection: 98 }), { affection: "large_positive" }).stats.affection, 100);
  assert.equal(applyEffects(makeState({ mood: 2 }), { mood: "large_negative" }).stats.mood, 0);
});

test("Case D: one choice updates four stats with centralized magnitudes", () => {
  const result = applyEffects(makeState(), {
    affection: "small_positive",
    mood: "small_positive",
    secrecy: "small_negative",
    companyAlert: "small_positive",
  });
  assert.equal(result.stats.affection, 51);
  assert.equal(result.stats.mood, 62);
  assert.equal(result.stats.secrecy, 78);
  assert.equal(result.stats.companyAlert, 32);
});

test("money uses a centralized scale and cannot become negative", () => {
  assert.equal(getEffectDelta("money", "small_positive"), 200);
  assert.equal(applyEffects(makeState({ money: 100 }), { money: "large_negative" }).stats.money, 0);
});

test("Case E: character boundary strengthens negative affection", () => {
  const state = makeState({ affection: 70 }, "sion");
  const evaluation = evaluateAction(state, tabooAction("deception"));
  const ordinary = applyEffects(state, { affection: "medium_negative" });
  const taboo = settleChoice(state, { affection: "medium_negative" }, {
    eventId: "boundary",
    choiceId: "A",
    ruleEvaluation: evaluation,
  });
  assert.equal(ordinary.stats.affection, 65);
  assert.equal(taboo.gameState.stats.affection, 62);
  assert.ok(taboo.changeLog.modifiers.includes("characterBoundaryNegativeAffection"));
});

test("Sakuya unfaithfulness applies the source-defined mood reset after Rule Engine match", () => {
  const state = makeState({ affection: 70, mood: 77 }, "sakuya");
  const evaluation = evaluateAction(state, tabooAction("unfaithfulness"));
  const result = settleChoice(state, { affection: "small_negative" }, {
    eventId: "boundary",
    choiceId: "A",
    ruleEvaluation: evaluation,
  });
  assert.equal(result.gameState.stats.mood, 0);
  assert.ok(result.changeLog.modifiers.includes("sakuyaUnfaithfulnessMoodReset"));
});

test("State Change Log records the required settlement evidence", () => {
  const result = settleChoice(makeState(), { mood: "small_positive", money: "small_negative" }, {
    eventId: "rent_due",
    choiceId: "C",
  });
  assert.equal(result.changeLog.week, 12);
  assert.equal(result.changeLog.eventId, "rent_due");
  assert.equal(result.changeLog.choiceId, "C");
  assert.equal(result.changeLog.before.mood, 60);
  assert.equal(result.changeLog.effects.mood, "small_positive");
  assert.equal(result.changeLog.after.mood, 62);
  assert.equal(result.changeLog.resolvedEffects.length, 2);
});

