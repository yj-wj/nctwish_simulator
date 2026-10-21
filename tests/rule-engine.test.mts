import assert from "node:assert/strict";
import { test } from "node:test";
import {
  evaluateAction,
  getMatchedTriggers,
  getRelationshipRule,
} from "../game/ruleEngine.ts";
import type { GameState, GameStats } from "../types/game.ts";
import type { StructuredPlayerAction } from "../types/rules.ts";

const baseStats: GameStats = {
  affection: 8,
  popularity: 0,
  mood: 72,
  money: 2300,
  secrecy: 100,
  companyAlert: 18,
  careerPressure: 67,
};

function makeState(stats: Partial<GameStats> = {}, maleLead: GameState["maleLead"] = "sion"): GameState {
  return {
    gameId: "rule-test",
    week: 1,
    currentScene: "测试场景",
    careerStage: "回归期",
    player: { name: "测试玩家", age: 24, identityId: "student", fanLevelId: "passerby" },
    maleLead,
    gameMode: "slow",
    stats: { ...baseStats, ...stats },
  };
}

function makeAction(overrides: Partial<StructuredPlayerAction> = {}): StructuredPlayerAction {
  return {
    type: "politeConversation",
    romanticIntensity: "none",
    physicalIntimacy: "none",
    publicExposure: "none",
    professionalBoundary: "respected",
    ...overrides,
  };
}

test("relationship rules follow affection-derived stages", () => {
  const stranger = getRelationshipRule(makeState({ affection: 10 }));
  assert.equal(stranger.stage.id, "strangers");
  assert.equal(stranger.allowedInteractionLevel, "formal");
  assert.ok(stranger.allowedActionTypes.includes("simpleHelp"));
  assert.ok(!stranger.allowedActionTypes.includes("confession"));

  const ambiguous = getRelationshipRule(makeState({ affection: 60 }));
  assert.equal(ambiguous.stage.id, "ambiguous");
  assert.equal(ambiguous.allowedInteractionLevel, "limitedIntimacy");
  assert.ok(ambiguous.allowedActionTypes.includes("flirt"));
  assert.ok(!ambiguous.allowedActionTypes.includes("defineRelationship"));

  const dating = getRelationshipRule(makeState({ affection: 85 }));
  assert.equal(dating.stage.id, "inLove");
  assert.equal(dating.allowedInteractionLevel, "intimateRelationship");
  assert.ok(dating.allowedActionTypes.includes("privateIntimacy"));
});

test("special triggers match strict thresholds", () => {
  const matches = getMatchedTriggers(makeState({
    mood: 19,
    secrecy: 29,
    popularity: 61,
    money: 499,
    companyAlert: 81,
    careerPressure: 91,
  }));
  assert.deepEqual(matches.map(({ id }) => id), [
    "emotional_breakdown",
    "exposure_crisis",
    "player_recognized",
    "financial_crisis",
    "company_intervention",
    "career_breakdown",
  ]);
});

test("special triggers do not match exact boundary values", () => {
  const matches = getMatchedTriggers(makeState({
    mood: 20,
    secrecy: 30,
    popularity: 60,
    money: 500,
    companyAlert: 80,
    careerPressure: 90,
  }));
  assert.deepEqual(matches, []);
});

test("out-of-stage actions remain attemptable but receive consequences", () => {
  const state = makeState({ affection: 10 });
  const before = structuredClone(state);
  const evaluation = evaluateAction(state, makeAction({ type: "confession", romanticIntensity: "high" }));
  assert.equal(evaluation.allowed, false);
  assert.equal(evaluation.canAttempt, true);
  assert.equal(evaluation.riskLevel, "high");
  assert.ok(evaluation.violatedRules.includes("relationshipMismatch"));
  assert.ok(evaluation.warnings.includes("rejectionLikely"));
  assert.ok(evaluation.narrativeGuidance.includes("doNotAutoAcceptBoundaryCrossing"));
  assert.deepEqual(state, before, "Rule Engine must not mutate GameState");
});

test("safe stranger interaction is allowed with low risk", () => {
  const evaluation = evaluateAction(makeState({ affection: 10 }), makeAction({ type: "simpleHelp" }));
  assert.equal(evaluation.allowed, true);
  assert.equal(evaluation.canAttempt, true);
  assert.equal(evaluation.riskLevel, "low");
  assert.deepEqual(evaluation.violatedRules, []);
});

test("structured character boundary signals match the selected Character Config", () => {
  const evaluation = evaluateAction(
    makeState({ affection: 70 }, "sion"),
    makeAction({ characterBoundarySignals: ["deception"] }),
  );
  assert.equal(evaluation.allowed, false);
  assert.ok(evaluation.violatedRules.includes("characterBoundaryTriggered"));
  assert.equal(evaluation.matchedCharacterBoundaries[0]?.id, "deception");
  assert.equal(evaluation.matchedCharacterBoundaries[0]?.characterId, "sion");
  assert.ok(evaluation.characterTraits.length > 0);
  assert.ok(evaluation.characterNarrativeConstraints.length > 0);
});

