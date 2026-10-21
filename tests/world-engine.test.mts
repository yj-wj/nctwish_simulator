import assert from "node:assert/strict";
import { test } from "node:test";
import { getWorldActorRegistry, npcRegistry } from "../config/npcs.ts";
import { getEventTemplate } from "../config/event-pool.ts";
import { initialStoryFlags } from "../config/history.ts";
import { buildEventWorldContext, buildWorldContext } from "../game/worldContextBuilder.ts";
import { calculateEventWeight, createEventHistoryEntry, getEligibleEvents } from "../game/eventEngine.ts";
import { createInitialWorldState, deriveWorldTriggers, enqueueWorldTriggers, processPendingWorldTriggers } from "../game/worldEngine.ts";
import type { GameState } from "../types/game.ts";
import type { MemoryRecord } from "../types/memory.ts";
import type { WorldSignal } from "../types/world.ts";

function state(): GameState {
  return {
    gameId: "world-test", week: 10, currentScene: "练习室外", careerStage: "回归期",
    player: { name: "玩家", age: 24, identityId: "student", fanLevelId: "passerby" },
    maleLead: "sion", gameMode: "standard",
    stats: { affection: 60, popularity: 45, mood: 60, money: 1800, secrecy: 70, companyAlert: 45, careerPressure: 60 },
  };
}

function signal(patch: Partial<WorldSignal> = {}): WorldSignal {
  return { gameId: "world-test", week: 10, source: "story", sourceId: "turn-1", eventId: "event-1", eventCategory: "daily", eventTags: [], outcomeTags: [], choiceTags: [], actorIds: ["player", "sion"], ...patch };
}

test("NPC Registry contains every GAME_SPEC slot exactly once", () => {
  assert.equal(npcRegistry.length, 8);
  assert.equal(new Set(npcRegistry.map(({ role }) => role)).size, 8);
  assert.equal(npcRegistry.every(({ enabled, personality, narrativeConstraints }) => enabled && personality.length > 0 && narrativeConstraints.length > 0), true);
  assert.equal(getWorldActorRegistry("sion").length, 9);
});

test("ordinary private story creates no unrelated world trigger", () => {
  assert.deepEqual(deriveWorldTriggers(signal()), []);
});

test("relationship confirmation creates deterministic Chat/Memory world work", () => {
  const triggers = deriveWorldTriggers(signal({ outcomeTags: ["relationship_confirmed"] }));
  assert.deepEqual(triggers.map(({ type }) => type), ["relationship_confirmed"]);
  const result = processPendingWorldTriggers(enqueueWorldTriggers(createInitialWorldState(), triggers), "sion", [], []);
  assert.equal(result.incomingMessageTriggers[0].reason, "relationship_confirmed_follow_up");
  assert.equal(result.worldState.recentEffects.some(({ target }) => target === "memory"), true);
});

test("exposure propagates to manager, fandom, Chat and SNS once", () => {
  const triggers = deriveWorldTriggers(signal({ outcomeTags: ["major_exposure"], publicSummary: "偷拍视频开始传播。" }));
  const queued = enqueueWorldTriggers(createInitialWorldState(), triggers);
  const first = processPendingWorldTriggers(queued, "sion", [], []);
  const second = processPendingWorldTriggers(first.worldState, "sion", first.incomingMessageTriggers, first.snsTriggers);
  assert.equal(first.worldState.npcStates.find(({ npcId }) => npcId === "npc:manager")?.active, true);
  assert.equal(first.worldState.npcStates.find(({ npcId }) => npcId === "npc:fandom-key-person")?.active, true);
  assert.equal(first.snsTriggers.length, 1);
  assert.equal(second.snsTriggers.length, 1);
  assert.equal(second.incomingMessageTriggers.length, 1);
});

test("same trigger id is enqueued and processed idempotently", () => {
  const trigger = deriveWorldTriggers(signal({ outcomeTags: ["financial_crisis"] }));
  const twice = enqueueWorldTriggers(enqueueWorldTriggers(createInitialWorldState(), trigger), trigger);
  assert.equal(twice.triggers.length, 1);
  const settled = processPendingWorldTriggers(twice, "sion", [], []);
  assert.equal(settled.worldState.processedTriggerIds.length, 1);
});

test("company intervention activates manager and increases tension through one updater", () => {
  const triggers = deriveWorldTriggers(signal({ eventCategory: "company", eventTags: ["company-intervention"] }));
  const result = processPendingWorldTriggers(enqueueWorldTriggers(createInitialWorldState(), triggers), "sion", [], []);
  const manager = result.worldState.npcStates.find(({ npcId }) => npcId === "npc:manager")!;
  assert.equal(manager.active, true);
  assert.equal(manager.relationship.tension, 22);
});

test("important NPC world action writes one scoped Structured Memory", () => {
  const triggers = deriveWorldTriggers(signal({ eventCategory: "company", eventTags: ["company-intervention"] }));
  const result = processPendingWorldTriggers(enqueueWorldTriggers(createInitialWorldState(), triggers), "sion", [], [], { gameId: "world-test", memories: [] });
  assert.equal(result.memories.length, 1);
  assert.ok(result.memories[0].actors.includes("npc:manager"));
  assert.ok(result.memories[0].knownBy.includes("npc:manager"));
  const again = processPendingWorldTriggers(result.worldState, "sion", result.incomingMessageTriggers, result.snsTriggers, { gameId: "world-test", memories: result.memories });
  assert.equal(again.memories.length, 1);
});

test("career and financial crises activate relevant support NPCs without autonomous turns", () => {
  const triggers = deriveWorldTriggers(signal({ outcomeTags: ["career_breakdown", "financial_crisis"] }));
  const result = processPendingWorldTriggers(enqueueWorldTriggers(createInitialWorldState(), triggers), "sion", [], []);
  assert.equal(result.worldState.npcStates.find(({ npcId }) => npcId === "npc:friend")?.active, true);
  assert.equal(result.worldState.triggers.every(({ status }) => status === "processed"), true);
});

test("hidden memory does not leak into player or public World Context", () => {
  const hidden: MemoryRecord = {
    id: "hidden-manager", gameId: "world-test", week: 10, type: "hidden", content: "公司内部秘密",
    actors: ["npc:manager"], tags: ["company"], importance: 5, emotion: null,
    visibility: "hidden", knownBy: ["npc:manager"], source: { kind: "outcome", settlementId: "secret" }, createdAtSequence: 1,
  };
  const base = { gameState: state(), worldState: createInitialWorldState(), storyFlags: { ...initialStoryFlags }, eventHistory: [], memories: [hidden], viewerId: "player" as const };
  assert.equal(buildWorldContext(base).relevantMemories.length, 0);
  assert.equal(buildWorldContext({ ...base, publicOnly: true }).relevantMemories.length, 0);
});

test("World Context keeps shared flags, crises and bounded recent data", () => {
  const flags = { ...initialStoryFlags, publicOpinionOutOfControl: true };
  const context = buildWorldContext({ gameState: state(), worldState: createInitialWorldState(), storyFlags: flags, eventHistory: [], memories: [], viewerId: "player" });
  assert.ok(context.storyFacts.includes("publicOpinionOutOfControl"));
  assert.ok(context.activeCrises.some(({ id }) => id === "public_opinion"));
  assert.ok(context.recentEventIds.length <= 4 && context.relevantNPCs.length <= 4);
});

test("Event participant actorIds survive selection history", () => {
  const event = getEventTemplate("company_manager_interview")!;
  const record = createEventHistoryEntry(event, state());
  assert.deepEqual(record.actorIds, ["npc:manager"]);
});

test("recent world effects raise linked Event weight and remain explainable", () => {
  const trigger = deriveWorldTriggers(signal({ eventCategory: "company", eventTags: ["company-intervention"] }));
  const settled = processPendingWorldTriggers(enqueueWorldTriggers(createInitialWorldState(), trigger), "sion", [], []);
  const eventWorld = buildEventWorldContext({ gameState: state(), worldState: settled.worldState, storyFlags: { ...initialStoryFlags }, eventHistory: [], memories: [], chatTurns: [], snsPosts: [], snsTriggers: [] });
  const event = getEventTemplate("company_manager_interview")!;
  const weight = calculateEventWeight(event, state(), { matchedTriggers: [] }, [], 3, eventWorld);
  assert.ok(weight.worldModifier > 1);
  assert.equal(Number.isFinite(weight.finalWeight), true);
});

test("Event cooldown still filters a world-linked event", () => {
  const worldState = createInitialWorldState();
  worldState.npcStates = worldState.npcStates.map((npc) => npc.npcId === "npc:manager" ? { ...npc, active: true } : npc);
  const game = state();
  const event = getEventTemplate("company_manager_interview")!;
  const history = [createEventHistoryEntry(event, { ...game, week: 9 })];
  const result = getEligibleEvents(game, { history, world: { activeNpcIds: ["npc:manager"], storyFlags: [], recentChatOutcomeTags: [], snsLevel: "normal", activeCrisisIds: [], pendingTriggerTypes: [], pendingStoryEventIds: [] } }, [event]);
  assert.equal(result.eligibleEvents.length, 0);
  assert.equal(result.filteredEvents[0].reasons.some(({ code }) => code === "cooldown"), true);
});
