import assert from "node:assert/strict";
import { test } from "node:test";
import { endingDefinitions, initialEndingContext } from "../config/endings.ts";
import {
  evaluateEndingCandidates,
  getEndingCandidates,
  getEndingDerivedConditions,
} from "../game/endingEngine.ts";
import { getMatchedTriggers } from "../game/ruleEngine.ts";
import type { EndingContext, EndingHistoryMetrics, EndingStoryFlags } from "../types/ending.ts";
import type { GameState, GameStats } from "../types/game.ts";

const baseStats: GameStats = {
  affection: 50,
  popularity: 40,
  mood: 50,
  money: 1000,
  secrecy: 50,
  companyAlert: 50,
  careerPressure: 50,
};

function makeState(week = 12, stats: Partial<GameStats> = {}): GameState {
  return {
    gameId: "ending-test",
    week,
    currentScene: "测试场景",
    careerStage: "回归期",
    player: { name: "测试玩家", age: 24, identityId: "student", fanLevelId: "passerby" },
    maleLead: "sion",
    gameMode: "standard",
    stats: { ...baseStats, ...stats },
  };
}

function makeContext(
  historyMetrics: Partial<EndingHistoryMetrics> = {},
  storyFlags: Partial<EndingStoryFlags> = {},
): EndingContext {
  return {
    historyMetrics: { ...initialEndingContext.historyMetrics, ...historyMetrics },
    storyFlags: { ...initialEndingContext.storyFlags, ...storyFlags },
  };
}

function candidateIds(state: GameState, context: EndingContext): string[] {
  return getEndingCandidates(state, context).map(({ id }) => id);
}

const heState = () => makeState(12, {
  affection: 90,
  secrecy: 60,
  companyAlert: 70,
  careerPressure: 90,
  mood: 40,
  money: 500,
});
const heContext = () => makeContext(
  { selfGrowthEventCount: 2 },
  { relationshipConfirmed: true },
);

test("all five executable GAME_SPEC ending IDs are configured", () => {
  assert.deepEqual(endingDefinitions.map(({ id, type }) => [id, type]), [
    ["HE_SECRET_STABLE", "HE"],
    ["OE_WAITING", "OE"],
    ["BE_EXPOSURE", "BE"],
    ["BE_PLAYER_LEAVES", "BE"],
    ["SE_PUBLIC_RELATIONSHIP", "SE"],
  ]);
});

test("HE appears when every numeric, history, derived and story condition matches", () => {
  assert.ok(candidateIds(heState(), heContext()).includes("HE_SECRET_STABLE"));
});

test("HE does not appear when one key condition is missing", () => {
  assert.ok(!candidateIds(heState(), makeContext(
    { selfGrowthEventCount: 1 },
    { relationshipConfirmed: true },
  )).includes("HE_SECRET_STABLE"));
});

test("OE appears only with waiting choice and active separation pressure", () => {
  const state = makeState(12, { affection: 81, careerPressure: 75, companyAlert: 70 });
  const complete = makeContext({}, {
    relationshipConfirmed: true,
    separationPressureActive: true,
    waitOrMaintainRelationshipChoiceMade: true,
  });
  assert.ok(candidateIds(state, complete).includes("OE_WAITING"));
  assert.ok(!candidateIds(state, makeContext({}, {
    relationshipConfirmed: true,
    separationPressureActive: true,
  })).includes("OE_WAITING"));
});

test("BE_EXPOSURE appears only after major exposure, lost public opinion and separation outcome", () => {
  const state = makeState(12, { secrecy: 19, companyAlert: 86, popularity: 61 });
  const complete = makeContext({}, {
    majorExposureOccurred: true,
    publicOpinionOutOfControl: true,
    forcedSeparation: true,
  });
  assert.ok(candidateIds(state, complete).includes("BE_EXPOSURE"));
  assert.ok(!candidateIds(state, makeContext({}, {
    publicOpinionOutOfControl: true,
    forcedSeparation: true,
  })).includes("BE_EXPOSURE"));
});

test("BE_PLAYER_LEAVES appears only with all history thresholds and final leave choice", () => {
  const complete = makeContext({
    lowMoodWeeksInLast5: 3,
    selfProtectionChoiceCount: 3,
    unstableResponseCount: 2,
  }, { playerChoseLeave: true });
  assert.ok(candidateIds(makeState(), complete).includes("BE_PLAYER_LEAVES"));
  assert.ok(!candidateIds(makeState(), makeContext({
    lowMoodWeeksInLast5: 3,
    selfProtectionChoiceCount: 3,
    unstableResponseCount: 1,
  }, { playerChoseLeave: true })).includes("BE_PLAYER_LEAVES"));
});

test("SE appears only with public reveal success and stable career conditions", () => {
  const state = makeState(12, { affection: 95, careerPressure: 60, companyAlert: 60, popularity: 60 });
  const complete = makeContext({}, {
    relationshipConfirmed: true,
    publicRevealEventTriggered: true,
    publicRevealSucceeded: true,
  });
  assert.ok(candidateIds(state, complete).includes("SE_PUBLIC_RELATIONSHIP"));
  assert.ok(!candidateIds(state, makeContext({}, {
    relationshipConfirmed: true,
    publicRevealEventTriggered: true,
  })).includes("SE_PUBLIC_RELATIONSHIP"));
});

test("derived conditions use GameState plus formal History and Story inputs", () => {
  const context = makeContext({ selfGrowthEventCount: 2 }, { relationshipConfirmed: true });
  assert.deepEqual(getEndingDerivedConditions(makeState(12, {
    affection: 81,
    money: 500,
    mood: 40,
    careerPressure: 60,
  }), context), {
    playerLifeStable: true,
    stillInLove: true,
    maleLeadCareerStable: true,
  });
});

test("Ending Branch remains unavailable when neither checkpoint nor affection gate matches", () => {
  const evaluation = evaluateEndingCandidates(makeState(2, heState().stats), heContext());
  assert.equal(evaluation.progressEligible, false);
  assert.equal(evaluation.progressReason, "notEligible");
  assert.deepEqual(evaluation.candidates, []);
});

test("affection >= 91 independently opens the Ending Branch", () => {
  const evaluation = evaluateEndingCandidates(makeState(2, { affection: 91 }));
  assert.equal(evaluation.progressEligible, true);
  assert.equal(evaluation.progressReason, "affectionThreshold");
});

test("HE affection >= 90 does not replace the affection >= 91 branch gate", () => {
  const evaluation = evaluateEndingCandidates(makeState(2, { ...heState().stats, affection: 90 }), heContext());
  assert.equal(evaluation.progressEligible, false);
  assert.ok(!evaluation.candidates.some(({ id }) => id === "HE_SECRET_STABLE"));
});

test("secrecy < 30 triggers exposure crisis while secrecy < 20 remains required for BE_EXPOSURE", () => {
  const context = makeContext({}, {
    majorExposureOccurred: true,
    publicOpinionOutOfControl: true,
    forcedSeparation: true,
  });
  const crisisOnly = makeState(12, { secrecy: 29, companyAlert: 86, popularity: 61 });
  assert.ok(getMatchedTriggers(crisisOnly).some(({ id }) => id === "exposure_crisis"));
  assert.ok(!candidateIds(crisisOnly, context).includes("BE_EXPOSURE"));
  assert.ok(candidateIds(makeState(12, { secrecy: 19, companyAlert: 86, popularity: 61 }), context).includes("BE_EXPOSURE"));
});

test("multiple satisfied endings are returned together without random selection", () => {
  const state = makeState(12, {
    affection: 95,
    popularity: 60,
    mood: 40,
    money: 500,
    secrecy: 60,
    companyAlert: 60,
    careerPressure: 60,
  });
  const context = makeContext({ selfGrowthEventCount: 2 }, {
    relationshipConfirmed: true,
    publicRevealEventTriggered: true,
    publicRevealSucceeded: true,
  });
  const ids = candidateIds(state, context);
  assert.ok(ids.includes("HE_SECRET_STABLE"));
  assert.ok(ids.includes("SE_PUBLIC_RELATIONSHIP"));
});

test("week checkpoints remain exact 12, 24 and 36", () => {
  for (const week of [12, 24, 36]) {
    assert.equal(evaluateEndingCandidates(makeState(week)).progressReason, "weekCheckpoint");
  }
  assert.equal(evaluateEndingCandidates(makeState(13)).progressEligible, false);
});
