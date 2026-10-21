import assert from "node:assert/strict";
import { test } from "node:test";
import { getHistoryTestFixture } from "../config/history-fixtures.ts";
import { initialStoryFlags } from "../config/history.ts";
import { buildEndingContext } from "../game/endingContextBuilder.ts";
import { evaluateEndingCandidates } from "../game/endingEngine.ts";
import { getRelevantMemories, getVisibleMemories } from "../game/memoryEngine.ts";
import { processStructuredSettlement, type StructuredSettlementState } from "../game/settlementPipeline.ts";
import { createMemoryStorageAdapter } from "../storage/localStorageAdapter.ts";
import { createSaveRepository, SAVE_STORAGE_KEYS, SaveRepositoryError } from "../storage/saveRepository.ts";
import type { GameState } from "../types/game.ts";
import type { HistorySettlementInput } from "../types/history.ts";
import type { GameSaveData } from "../types/save.ts";

function makeState(name: string, maleLead: GameState["maleLead"] = "sion"): GameState {
  return {
    gameId: `game-${name}`,
    week: 12,
    currentScene: "测试场景",
    careerStage: "回归期",
    player: { name, age: 24, identityId: "student", fanLevelId: "passerby" },
    maleLead,
    gameMode: "standard",
    stats: {
      affection: 95,
      popularity: 20,
      mood: 70,
      money: 1600,
      secrecy: 80,
      companyAlert: 50,
      careerPressure: 50,
    },
  };
}

function emptyPipeline(): StructuredSettlementState {
  return {
    weeklyHistory: [],
    choiceHistory: [],
    eventHistory: [],
    storyFlags: { ...initialStoryFlags },
    processedSettlementIds: [],
    memories: [],
  };
}

function fixtureInput(fixtureId: string, state: GameState): HistorySettlementInput {
  const fixture = getHistoryTestFixture(fixtureId);
  assert.ok(fixture);
  return {
    settlementId: `fixture:${state.gameId}:${fixture.id}`,
    week: state.week,
    event: {
      recordId: `${state.gameId}:${fixture.eventRecordId}`,
      eventId: fixture.eventId,
      category: fixture.category,
      eventTags: fixture.eventTags,
    },
    choice: {
      choiceId: fixture.choiceId,
      choiceText: fixture.choiceText,
      choiceTags: fixture.choiceTags,
      isImportantRelationshipEvent: fixture.isImportantRelationshipEvent,
    },
    beforeState: { ...state.stats },
    afterState: { ...state.stats },
    relationshipStageBefore: "trial",
    relationshipStageAfter: "trial",
    outcome: fixture.outcome,
  };
}

function settleFixture(
  pipeline: StructuredSettlementState,
  state: GameState,
  fixtureId: string,
): StructuredSettlementState {
  return processStructuredSettlement(pipeline, state, fixtureInput(fixtureId, state));
}

function makeSaveData(name = "存档 A", maleLead: GameState["maleLead"] = "sion"): GameSaveData {
  const gameState = makeState(name, maleLead);
  let pipeline = emptyPipeline();
  for (const fixture of ["relationship-confirmed", "growth-study", "growth-career", "memory-hidden-manager"]) {
    pipeline = settleFixture(pipeline, gameState, fixture);
  }
  return {
    playerSetup: {
      name,
      age: "24",
      identityId: "student",
      customIdentity: "",
      maleLeadId: maleLead,
      fanLevelId: "passerby",
      gameModeId: "standard",
    },
    gameState,
    eventHistory: pipeline.eventHistory,
    choiceHistory: pipeline.choiceHistory,
    weeklyStateHistory: pipeline.weeklyHistory,
    storyFlags: pipeline.storyFlags,
    memories: pipeline.memories,
    processedSettlementIds: pipeline.processedSettlementIds,
    chatThreads: [],
    chatMessages: [],
    chatTurns: [],
    incomingMessageTriggers: [],
    snsPosts: [],
    snsTriggers: [],
    runtime: {
      playerConfirmed: true,
      characterConfirmed: true,
      entered: true,
      storyIndex: 2,
      previousChoice: null,
      receipt: null,
      selectedEventId: null,
      selectedEventRecordId: null,
      eventSeed: 8,
    },
  };
}

function repositoryHarness() {
  const storage = createMemoryStorageAdapter();
  const repository = createSaveRepository(storage, () => new Date("2026-10-22T10:00:00.000Z"));
  return { storage, repository };
}

test("Save / Load round trip preserves every authoritative Phase 4 field", () => {
  const { repository } = repositoryHarness();
  const data = makeSaveData();
  const created = repository.createSave(data, "save-a");
  const loaded = repository.loadGame("save-a");
  assert.equal(loaded.schemaVersion, 3);
  assert.deepEqual(loaded.playerSetup, data.playerSetup);
  assert.deepEqual(loaded.gameState, data.gameState);
  assert.deepEqual(loaded.eventHistory, data.eventHistory);
  assert.deepEqual(loaded.choiceHistory, data.choiceHistory);
  assert.deepEqual(loaded.weeklyStateHistory, data.weeklyStateHistory);
  assert.deepEqual(loaded.storyFlags, data.storyFlags);
  assert.deepEqual(loaded.memories, data.memories);
  assert.deepEqual(loaded.processedSettlementIds, data.processedSettlementIds);
  assert.equal(repository.getActiveSaveId(), created.saveId);
  assert.equal("endingCandidates" in loaded, false);
});

test("Phase 5C generated story runtime survives Save / Load for refresh continuation", () => {
  const { repository } = repositoryHarness();
  const data = makeSaveData("AI 回合存档");
  data.runtime.currentStory = {
    title: "下一段已经开始",
    story: "这一段经过验证并完成了正式结算。",
    choices: [
      { id: "A", text: "保持距离" },
      { id: "B", text: "继续交谈" },
      { id: "C", text: "处理自己的安排" },
    ],
    suggestedEffects: [{ stat: "mood", magnitude: "small_positive", reason: "测试" }],
    suggestedChoiceTags: ["maintain_relationship"],
    suggestedOutcomeTags: [],
    memoryCandidates: [],
  };
  repository.createSave(data, "ai-turn-save");
  const loaded = repository.loadGame("ai-turn-save");
  assert.deepEqual(loaded.runtime.currentStory, data.runtime.currentStory);
});

test("schema v3 persists Chat/SNS and migrates v1/v2 saves", () => {
  const { storage, repository } = repositoryHarness();
  const data = makeSaveData("Chat 存档");
  data.chatThreads = [{ id: "player:sion", playerId: "player", participantId: "sion", unreadCount: 1, lastReadSequence: 0, createdAt: "2026-10-22T10:00:00.000Z", updatedAt: "2026-10-22T10:00:00.000Z" }];
  data.chatMessages = [{ id: "message-1", threadId: "player:sion", senderId: "sion", receiverId: "player", content: "到家了吗？", week: 12, sequence: 1, source: "ai", createdAt: "2026-10-22T10:00:00.000Z" }];
  data.snsTriggers = [{ id: "sns:test", reason: "airport_sighting", level: "attention", week: 12, sourceCategory: "publicOpinion", sourceTags: ["airport", "media"], publicTitle: "机场行程", publicSummary: "公开行程受到关注。", status: "delivered" }];
  data.snsPosts = [{ id: "sns:test:post:1", authorId: "fan-update", authorName: "花园资讯", handle: "@garden", accountType: "fan", content: "今天的机场公开行程受到关注。", week: 12, sequence: 1, tags: ["airport", "fandom"], visibility: "public", sentiment: "positive", reactions: { likes: 120, reposts: 20, comments: 8, heat: 150 }, sourceTriggerId: "sns:test", read: false, createdAt: "2026-10-22T10:00:00.000Z" }];
  repository.createSave(data, "chat-v2");
  const chatLoaded = repository.loadGame("chat-v2");
  assert.equal(chatLoaded.schemaVersion, 3);
  assert.equal(chatLoaded.chatMessages[0].content, "到家了吗？");
  assert.equal(chatLoaded.snsPosts[0].content, "今天的机场公开行程受到关注。");
  assert.equal(chatLoaded.snsPosts[0].read, false);

  const legacy = structuredClone(repository.createSave(makeSaveData("旧存档"), "legacy-v1")) as unknown as Record<string, unknown>;
  legacy.schemaVersion = 1;
  delete legacy.chatThreads; delete legacy.chatMessages; delete legacy.chatTurns; delete legacy.incomingMessageTriggers;
  storage.setItem(SAVE_STORAGE_KEYS.save("legacy-v1"), JSON.stringify(legacy));
  const migrated = repository.loadGame("legacy-v1");
  assert.equal(migrated.schemaVersion, 3);
  assert.deepEqual(migrated.chatThreads, []);
  assert.deepEqual(migrated.chatMessages, []);
  assert.deepEqual(migrated.snsPosts, []);
  assert.equal(JSON.parse(storage.getItem(SAVE_STORAGE_KEYS.save("legacy-v1"))!).schemaVersion, 3);

  const legacyV2 = structuredClone(repository.createSave(makeSaveData("v2 存档"), "legacy-v2")) as unknown as Record<string, unknown>;
  legacyV2.schemaVersion = 2;
  delete legacyV2.snsPosts; delete legacyV2.snsTriggers;
  storage.setItem(SAVE_STORAGE_KEYS.save("legacy-v2"), JSON.stringify(legacyV2));
  const migratedV2 = repository.loadGame("legacy-v2");
  assert.equal(migratedV2.schemaVersion, 3);
  assert.deepEqual(migratedV2.snsPosts, []);
  assert.deepEqual(migratedV2.snsTriggers, []);
});

test("derived Ending Candidate is rebuilt from loaded facts instead of persisted", () => {
  const { repository } = repositoryHarness();
  repository.createSave(makeSaveData(), "ending-save");
  const loaded = repository.loadGame("ending-save");
  const context = buildEndingContext(
    loaded.gameState,
    loaded.weeklyStateHistory,
    loaded.choiceHistory,
    loaded.eventHistory,
    loaded.storyFlags,
  );
  const candidates = evaluateEndingCandidates(loaded.gameState, context).candidates.map(({ id }) => id);
  assert.ok(candidates.includes("HE_SECRET_STABLE"));
});

test("multiple saves stay isolated and a new game starts with empty Phase 4 data", () => {
  const { repository } = repositoryHarness();
  repository.createSave(makeSaveData("玩家 A", "sion"), "save-a");
  const emptyB = makeSaveData("玩家 B", "riku");
  emptyB.gameState.stats.affection = 20;
  emptyB.eventHistory = [];
  emptyB.choiceHistory = [];
  emptyB.weeklyStateHistory = [];
  emptyB.storyFlags = { ...initialStoryFlags };
  emptyB.memories = [];
  emptyB.processedSettlementIds = [];
  repository.createSave(emptyB, "save-b");
  const a = repository.loadGame("save-a");
  const b = repository.loadGame("save-b");
  assert.equal(a.gameState.maleLead, "sion");
  assert.equal(a.storyFlags.relationshipConfirmed, true);
  assert.ok(a.memories.length > 0);
  assert.equal(b.gameState.maleLead, "riku");
  assert.equal(b.gameState.stats.affection, 20);
  assert.equal(b.storyFlags.relationshipConfirmed, false);
  assert.equal(b.choiceHistory.length, 0);
  assert.equal(b.memories.length, 0);
});

test("shared and hidden Memory survive load with their knowledge scope", () => {
  const { repository } = repositoryHarness();
  repository.createSave(makeSaveData(), "memory-save");
  const loaded = repository.loadGame("memory-save");
  assert.equal(loaded.memories.length, 2);
  assert.equal(getVisibleMemories(loaded.memories, "player").length, 1);
  assert.equal(getVisibleMemories(loaded.memories, "npc:manager").length, 1);
  assert.equal(getVisibleMemories(loaded.memories, "sion").some(({ visibility }) => visibility === "hidden"), false);
  const relevant = getRelevantMemories(loaded.memories, {
    currentWeek: loaded.gameState.week,
    viewerId: "player",
    actors: ["sion"],
    tags: ["relationship"],
  });
  assert.equal(relevant[0].memory.type, "relationship");
});

test("processed settlements remain idempotent after load", () => {
  const { repository } = repositoryHarness();
  repository.createSave(makeSaveData(), "dedupe-save");
  const loaded = repository.loadGame("dedupe-save");
  const pipeline: StructuredSettlementState = {
    weeklyHistory: loaded.weeklyStateHistory,
    choiceHistory: loaded.choiceHistory,
    eventHistory: loaded.eventHistory,
    storyFlags: loaded.storyFlags,
    processedSettlementIds: loaded.processedSettlementIds,
    memories: loaded.memories,
  };
  const replayed = settleFixture(pipeline, loaded.gameState, "relationship-confirmed");
  assert.equal(replayed, pipeline);
  assert.equal(replayed.choiceHistory.length, loaded.choiceHistory.length);
  assert.equal(replayed.memories.length, loaded.memories.length);
});

test("corrupted JSON and unsupported versions fail clearly without overwriting data", () => {
  const { storage, repository } = repositoryHarness();
  storage.setItem(SAVE_STORAGE_KEYS.save("broken"), "{not-json");
  assert.throws(() => repository.loadGame("broken"), (error) =>
    error instanceof SaveRepositoryError && error.code === "invalid_json");
  assert.equal(storage.getItem(SAVE_STORAGE_KEYS.save("broken")), "{not-json");

  storage.setItem(SAVE_STORAGE_KEYS.save("future"), JSON.stringify({ schemaVersion: 99 }));
  assert.throws(() => repository.loadGame("future"), (error) =>
    error instanceof SaveRepositoryError && error.code === "unsupported_version");

  storage.setItem(SAVE_STORAGE_KEYS.save("missing-fields"), JSON.stringify({ schemaVersion: 1, saveId: "missing-fields" }));
  assert.throws(() => repository.loadGame("missing-fields"), (error) =>
    error instanceof SaveRepositoryError && error.code === "invalid_schema");
});

test("delete removes only the requested slot and clears active only when needed", () => {
  const { repository } = repositoryHarness();
  repository.createSave(makeSaveData("玩家 A"), "save-a");
  repository.createSave(makeSaveData("玩家 B", "riku"), "save-b");
  repository.setActiveSaveId("save-a");
  repository.deleteSave("save-b");
  assert.equal(repository.loadGame("save-a").gameState.player.name, "玩家 A");
  assert.equal(repository.getActiveSaveId(), "save-a");
  assert.deepEqual(repository.listSaves().map(({ saveId }) => saveId), ["save-a"]);
  repository.deleteSave("save-a");
  assert.equal(repository.getActiveSaveId(), null);
  assert.throws(() => repository.loadGame("save-a"), (error) =>
    error instanceof SaveRepositoryError && error.code === "not_found");
});
