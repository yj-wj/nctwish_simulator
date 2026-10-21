import assert from "node:assert/strict";
import { test } from "node:test";
import { directedEventTemplates, eventPool, triggerEventTemplates } from "../config/event-pool.ts";
import {
  calculateEventWeight,
  createEventHistoryEntry,
  getEligibleEvents,
  runEventEngine,
} from "../game/eventEngine.ts";
import type { EventCategory, EventTemplate } from "../types/event.ts";
import type { GameModeId, GameState, GameStats } from "../types/game.ts";
import { getMatchedTriggers } from "../game/ruleEngine.ts";

const baseStats: GameStats = {
  affection: 10,
  popularity: 0,
  mood: 72,
  money: 2300,
  secrecy: 100,
  companyAlert: 20,
  careerPressure: 67,
};

function makeState(stats: Partial<GameStats> = {}, gameMode: GameModeId = "slow"): GameState {
  return {
    gameId: "event-test",
    week: 1,
    currentScene: "测试场景",
    careerStage: "回归期",
    player: { name: "测试玩家", age: 24, identityId: "student", fanLevelId: "passerby" },
    maleLead: "sion",
    gameMode,
    stats: { ...baseStats, ...stats },
  };
}

function categoryWeight(result: ReturnType<typeof runEventEngine>, category: EventCategory): number {
  return result.eligibleEvents
    .filter(({ event }) => event.category === category)
    .reduce((sum, { weight }) => sum + weight.finalWeight, 0);
}

test("Event Pool retains all 61 directed examples and 35 trigger references", () => {
  assert.equal(directedEventTemplates.length, 61);
  assert.equal(triggerEventTemplates.length, 35);
  assert.equal(eventPool.length, 96);
  assert.equal(new Set(eventPool.map(({ id }) => id)).size, eventPool.length);
});

test("Case A: stranger pool keeps ordinary events and filters relationship leaps", () => {
  const result = runEventEngine(makeState(), { seed: 1 });
  const eligibleIds = new Set(result.eligibleEvents.map(({ event }) => event.id));
  assert.ok(eligibleIds.has("comeback_music_show_prerecording"));
  assert.ok(eligibleIds.has("airport_incheon_arrival_departure"));
  assert.ok(eligibleIds.has("airport_flashlights"));
  assert.ok(!eligibleIds.has("company_reduce_private_contact"));
  assert.ok(!eligibleIds.has("crisis_dispatch_countdown"));
  assert.ok(!eligibleIds.has("trigger_exposure_cut_contact"));
  assert.equal(result.matchedTriggers.length, 0);
});

test("Case B: ambiguous stage clearly raises relationship event weight", () => {
  const stranger = runEventEngine(makeState({ affection: 10 }, "standard"), { seed: 1 });
  const ambiguous = runEventEngine(makeState({ affection: 60 }, "standard"), { seed: 1 });
  assert.ok(categoryWeight(ambiguous, "relationship") > categoryWeight(stranger, "relationship") * 2);
  assert.ok(ambiguous.eligibleEvents.some(({ event }) => event.id === "airport_eye_contact_too_long"));
});

test("Case C: exposure trigger activates and boosts public opinion, crisis and company events", () => {
  const exposedState = makeState({ secrecy: 20 });
  const baseline = runEventEngine(makeState(), { seed: 3 });
  const exposed = runEventEngine(exposedState, { seed: 3 });
  assert.deepEqual(exposed.matchedTriggers.map(({ id }) => id), ["exposure_crisis"]);
  assert.ok(exposed.eligibleEvents.some(({ event }) => event.id === "trigger_exposure_anonymous_tip"));
  assert.ok(exposed.eligibleEvents.some(({ event }) => event.id === "trigger_exposure_emergency_meeting"));
  for (const category of ["publicOpinion", "crisis", "company"] as const) {
    assert.ok(categoryWeight(exposed, category) > categoryWeight(baseline, category));
  }
});

test("Case D and E: company and financial triggers add high-priority candidates", () => {
  const company = runEventEngine(makeState({ companyAlert: 90 }), { seed: 4 });
  assert.ok(company.eligibleEvents.some(({ event }) => event.id === "trigger_company_formal_manager_talk"));
  assert.ok(categoryWeight(company, "company") > categoryWeight(runEventEngine(makeState(), { seed: 4 }), "company"));

  const financial = runEventEngine(makeState({ money: 300 }), { seed: 5 });
  assert.ok(financial.eligibleEvents.some(({ event }) => event.id === "trigger_financial_rent_due"));
  assert.ok(financial.eligibleEvents.some(({ event }) => event.id === "trigger_financial_part_time_fired"));
  assert.ok(categoryWeight(financial, "reality") > categoryWeight(runEventEngine(makeState(), { seed: 5 }), "reality"));
});

test("Case F: pressure and healing modes produce materially different distributions", () => {
  const stateStats = { affection: 70, secrecy: 20, companyAlert: 90 };
  const pressure = runEventEngine(makeState(stateStats, "pressure"), { seed: 7 });
  const healing = runEventEngine(makeState(stateStats, "healing"), { seed: 7 });
  assert.ok(categoryWeight(pressure, "publicOpinion") > categoryWeight(healing, "publicOpinion") * 2);
  assert.ok(categoryWeight(pressure, "company") > categoryWeight(healing, "company") * 2);
  assert.ok(categoryWeight(pressure, "crisis") > categoryWeight(healing, "crisis") * 2);
  assert.ok(categoryWeight(healing, "daily") > categoryWeight(pressure, "daily"));
  assert.ok(categoryWeight(healing, "relationship") > categoryWeight(pressure, "relationship"));
});

test("cooldown, once-per-save and recent penalty use Event History", () => {
  const state = { ...makeState({ affection: 70 }), week: 8 };
  const cooldownEvent: EventTemplate = {
    id: "cooldown-test",
    category: "daily",
    title: "冷却测试",
    sourceKind: "example",
    tags: ["daily-life"],
    baseWeight: 10,
    cooldown: 2,
  };
  const onceEvent: EventTemplate = { ...cooldownEvent, id: "once-test", title: "单次测试", oncePerSave: true };
  const recentEvent: EventTemplate = { ...cooldownEvent, id: "recent-test", title: "近期测试", cooldown: undefined };
  const history = [
    { eventId: cooldownEvent.id, week: 7, category: cooldownEvent.category },
    { eventId: onceEvent.id, week: 1, category: onceEvent.category },
    { eventId: recentEvent.id, week: 8, category: recentEvent.category },
  ];
  const eligibility = getEligibleEvents(state, { history }, [cooldownEvent, onceEvent, recentEvent]);
  assert.deepEqual(eligibility.eligibleEvents.map(({ id }) => id), ["recent-test"]);
  assert.equal(eligibility.filteredEvents.find(({ event }) => event.id === "cooldown-test")?.reasons[0]?.code, "cooldown");
  assert.equal(eligibility.filteredEvents.find(({ event }) => event.id === "once-test")?.reasons[0]?.code, "oncePerSave");
  const weight = calculateEventWeight(recentEvent, state, { matchedTriggers: [] }, history);
  assert.equal(weight.recentEventPenalty, 0.28);
});

test("week, career stage, game mode and explicit exclusions are enforced", () => {
  const state = makeState();
  const constrained: EventTemplate[] = [
    { id: "future", category: "daily", title: "未来事件", sourceKind: "example", tags: ["daily-life"], baseWeight: 1, requirements: { minWeek: 2 } },
    { id: "tour", category: "career", title: "巡演事件", sourceKind: "example", tags: ["tour"], baseWeight: 1, careerStages: ["巡演期"] },
    { id: "healing", category: "daily", title: "治愈限定", sourceKind: "example", tags: ["daily-life"], baseWeight: 1, gameModes: ["healing"] },
    { id: "excluded", category: "daily", title: "排除事件", sourceKind: "example", tags: ["daily-life"], baseWeight: 1, exclusions: { relationshipStages: ["strangers"] } },
  ];
  const result = getEligibleEvents(state, {}, constrained);
  assert.deepEqual(result.eligibleEvents, []);
  assert.deepEqual(result.filteredEvents.map(({ reasons }) => reasons[0]?.code), [
    "week",
    "careerStage",
    "gameMode",
    "excludedByState",
  ]);
});

test("selection is seeded, history entries are minimal, and the engine never mutates GameState", () => {
  const state = makeState({ affection: 60 });
  const before = structuredClone(state);
  const first = runEventEngine(state, { seed: "same-seed" });
  const second = runEventEngine(state, { seed: "same-seed" });
  assert.equal(first.selectedEvent?.event.id, second.selectedEvent?.event.id);
  assert.deepEqual(state, before);
  assert.ok(first.selectedEvent);
  assert.deepEqual(createEventHistoryEntry(first.selectedEvent.event, state), {
    eventId: first.selectedEvent.event.id,
    week: 1,
    category: first.selectedEvent.event.category,
  });
  assert.deepEqual(getMatchedTriggers(state), first.matchedTriggers);
});
