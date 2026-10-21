import assert from "node:assert/strict";
import { test } from "node:test";
import { initialStoryFlags } from "../config/history.ts";
import { buildEndingContext } from "../game/endingContextBuilder.ts";
import { getEndingCandidates, getEndingDerivedConditions } from "../game/endingEngine.ts";
import {
  deriveHistoryMetrics,
  getRecentWeeklySnapshots,
  processHistorySettlement,
  recordWeeklySnapshot,
} from "../game/historyEngine.ts";
import type { EventHistoryEntry } from "../types/event.ts";
import type { GameState, GameStats } from "../types/game.ts";
import type {
  ChoiceHistoryRecord,
  HistorySettlementInput,
  StoryFlagEffect,
} from "../types/history.ts";

const baseStats: GameStats = {
  affection: 50,
  popularity: 40,
  mood: 60,
  money: 1000,
  secrecy: 70,
  companyAlert: 50,
  careerPressure: 50,
};

function makeState(week: number, stats: Partial<GameStats> = {}): GameState {
  return {
    gameId: "history-test",
    week,
    currentScene: "测试场景",
    careerStage: "回归期",
    player: { name: "测试玩家", age: 24, identityId: "student", fanLevelId: "passerby" },
    maleLead: "sion",
    gameMode: "standard",
    stats: { ...baseStats, ...stats },
  };
}

function choiceRecord(
  id: string,
  week: number,
  tags: ChoiceHistoryRecord["choiceTags"],
  important = false,
): ChoiceHistoryRecord {
  return {
    id,
    settlementId: id,
    week,
    eventId: `event-${id}`,
    choiceId: `choice-${id}`,
    choiceText: id,
    choiceTags: tags,
    isImportantRelationshipEvent: important,
    beforeState: { ...baseStats },
    afterState: { ...baseStats },
    relationshipStageBefore: "interested",
    relationshipStageAfter: "interested",
  };
}

function eventRecord(id: string, week: number, outcomeTags: EventHistoryEntry["outcomeTags"], status: EventHistoryEntry["status"] = "resolved"): EventHistoryEntry {
  return {
    recordId: id,
    eventId: id,
    week,
    category: "crisis",
    eventTags: [],
    outcomeTags,
    status,
    settlementId: id,
    flagEffects: [],
  };
}

function emptyPipeline() {
  return {
    weeklyHistory: [],
    choiceHistory: [],
    eventHistory: [],
    storyFlags: { ...initialStoryFlags },
    processedSettlementIds: [],
  };
}

function settlement(
  id: string,
  week: number,
  options: {
    choiceTags?: HistorySettlementInput["choice"]["choiceTags"];
    important?: boolean;
    outcomeTags?: HistorySettlementInput["outcome"]["outcomeTags"];
    eventStatus?: HistorySettlementInput["outcome"]["eventStatus"];
    flagEffects?: StoryFlagEffect[];
    eventRecordId?: string;
  } = {},
): HistorySettlementInput {
  return {
    settlementId: id,
    week,
    event: {
      recordId: options.eventRecordId ?? `event:${id}`,
      eventId: options.eventRecordId ?? `event:${id}`,
      category: "relationship",
      eventTags: ["relationship-progress"],
    },
    choice: {
      choiceId: `choice:${id}`,
      choiceText: id,
      choiceTags: options.choiceTags ?? [],
      isImportantRelationshipEvent: options.important ?? false,
    },
    beforeState: { ...baseStats },
    afterState: { ...baseStats },
    relationshipStageBefore: "interested",
    relationshipStageAfter: "interested",
    outcome: {
      outcomeTags: options.outcomeTags ?? [],
      eventStatus: options.eventStatus ?? "resolved",
      flagEffects: options.flagEffects ?? [],
    },
  };
}

test("weekly snapshots are unique per week and recent 5 / 8 queries are ordered", () => {
  let history = [] as ReturnType<typeof recordWeeklySnapshot>;
  for (let week = 1; week <= 10; week += 1) {
    history = recordWeeklySnapshot(history, makeState(week, { mood: week }), `week-${week}`);
  }
  const duplicate = recordWeeklySnapshot(history, makeState(10, { mood: 99 }), "duplicate-week-10");
  assert.equal(duplicate.length, 10);
  assert.equal(duplicate.at(-1)?.mood, 99);
  assert.deepEqual(getRecentWeeklySnapshots(history, 5).map(({ week }) => week), [6, 7, 8, 9, 10]);
  assert.deepEqual(getRecentWeeklySnapshots(history, 8).map(({ week }) => week), [3, 4, 5, 6, 7, 8, 9, 10]);
});

test("lowMoodWeeksInLast5 counts 25, 28, 60, 20, 70 as three low weeks", () => {
  const moods = [25, 28, 60, 20, 70];
  const weekly = moods.map((mood, index) => recordWeeklySnapshot([], makeState(index + 1, { mood }), `week-${index + 1}`)[0]);
  assert.equal(deriveHistoryMetrics(5, weekly, [], []).lowMoodWeeksInLast5, 3);
});

test("three important self-protection choices count once each and duplicate settlement is idempotent", () => {
  let pipeline = emptyPipeline();
  for (let index = 1; index <= 3; index += 1) {
    const input = settlement(`protect-${index}`, index, { choiceTags: ["self_protection"], important: true });
    pipeline = processHistorySettlement(pipeline, makeState(index), input);
  }
  pipeline = processHistorySettlement(pipeline, makeState(3), settlement("protect-3", 3, { choiceTags: ["self_protection"], important: true }));
  assert.equal(pipeline.choiceHistory.length, 3);
  assert.equal(deriveHistoryMetrics(3, pipeline.weeklyHistory, pipeline.choiceHistory, pipeline.eventHistory).selfProtectionChoiceCount, 3);
});

test("self growth only counts distinct formal settlements inside the last 8-week window", () => {
  const choices = [
    choiceRecord("old", 2, ["self_growth"]),
    choiceRecord("study", 4, ["study"]),
    choiceRecord("career", 10, ["career"]),
  ];
  assert.equal(deriveHistoryMetrics(10, [], choices, []).selfGrowthEventsInLast8Weeks, 2);
});

test("two formal unstable_response outcomes produce unstableResponseCount = 2", () => {
  const events = [eventRecord("unstable-1", 1, ["unstable_response"]), eventRecord("unstable-2", 2, ["unstable_response"])];
  assert.equal(deriveHistoryMetrics(2, [], [], events).unstableResponseCount, 2);
});

test("Story Flags update and clear only through structured flag effects", () => {
  let pipeline = processHistorySettlement(
    emptyPipeline(),
    makeState(1),
    settlement("crisis-start", 1, { flagEffects: [{ flag: "unresolvedMajorCrisis", value: true }] }),
  );
  assert.equal(pipeline.storyFlags.unresolvedMajorCrisis, true);

  pipeline = processHistorySettlement(
    pipeline,
    makeState(2),
    settlement("crisis-resolved", 2, { flagEffects: [{ flag: "unresolvedMajorCrisis", value: false }] }),
  );
  assert.equal(pipeline.storyFlags.unresolvedMajorCrisis, false);
});

test("financial crisis active then resolved no longer blocks playerLifeStable", () => {
  const state = makeState(12, { money: 500, mood: 40 });
  let pipeline = emptyPipeline();
  pipeline = processHistorySettlement(pipeline, state, settlement("growth-1", 12, { choiceTags: ["study"] }));
  pipeline = processHistorySettlement(pipeline, state, settlement("growth-2", 12, { choiceTags: ["career"] }));
  pipeline = processHistorySettlement(pipeline, state, settlement("crisis-active", 12, {
    outcomeTags: ["financial_crisis"], eventStatus: "active", eventRecordId: "financial-crisis",
  }));
  let context = buildEndingContext(state, pipeline.weeklyHistory, pipeline.choiceHistory, pipeline.eventHistory, pipeline.storyFlags);
  assert.equal(getEndingDerivedConditions(state, context).playerLifeStable, false);
  pipeline = processHistorySettlement(pipeline, state, settlement("crisis-resolved", 12, {
    outcomeTags: ["financial_crisis"], eventStatus: "resolved", eventRecordId: "financial-crisis",
  }));
  context = buildEndingContext(state, pipeline.weeklyHistory, pipeline.choiceHistory, pipeline.eventHistory, pipeline.storyFlags);
  assert.equal(context.historyFacts.unresolvedFinancialCrisis, false);
  assert.equal(getEndingDerivedConditions(state, context).playerLifeStable, true);
});

test("automatic History and Story Flags can produce an Ending Candidate", () => {
  const state = makeState(12, {
    affection: 90,
    secrecy: 60,
    companyAlert: 70,
    careerPressure: 90,
    mood: 40,
    money: 500,
  });
  let pipeline = emptyPipeline();
  pipeline = processHistorySettlement(pipeline, state, settlement("growth-study", 12, { choiceTags: ["study"] }));
  pipeline = processHistorySettlement(pipeline, state, settlement("growth-career", 12, { choiceTags: ["career"] }));
  pipeline = processHistorySettlement(pipeline, state, settlement("relationship-confirmed", 12, {
    flagEffects: [{ flag: "relationshipConfirmed", value: true }],
  }));
  const context = buildEndingContext(state, pipeline.weeklyHistory, pipeline.choiceHistory, pipeline.eventHistory, pipeline.storyFlags);
  assert.ok(getEndingCandidates(state, context).some(({ id }) => id === "HE_SECRET_STABLE"));
});
