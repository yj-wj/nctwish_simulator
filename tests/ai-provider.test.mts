import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createQwenJSONSchema } from "../ai/jsonSchema.ts";
import { QwenAIProvider, QwenProviderError } from "../ai/server/qwenProvider.ts";
import { createServerAIProvider } from "../ai/server/providerFactory.ts";
import type { QwenServerConfig } from "../ai/server/serverConfig.ts";
import { actionInterpretationOutputSchema, storyGenerationOutputSchema } from "../ai/schemas.ts";
import { buildActionInterpretationInput, buildStoryGenerationInput } from "../game/contextBuilder.ts";
import type { EventHistoryEntry } from "../types/event.ts";
import type { GameState } from "../types/game.ts";
import type { StoryFlagState } from "../types/history.ts";
import type { MemoryRecord } from "../types/memory.ts";

const flags: StoryFlagState = {
  relationshipConfirmed: false, formalBreakup: false, majorExposureOccurred: false, publicOpinionOutOfControl: false,
  publicRevealEventTriggered: false, publicRevealSucceeded: false, unresolvedMajorCrisis: false, separationPressureActive: false,
  playerChoseLeave: false, playerChoseSeparation: false, forcedSeparation: false, relationshipFailedDuringExposure: false,
  playerCareerStable: false,
};

const state: GameState = {
  gameId: "qwen-test", week: 3, currentScene: "电视台后门", careerStage: "回归期",
  player: { name: "测试玩家", age: 24, identityId: "student", fanLevelId: "passerby" },
  maleLead: "sion", gameMode: "standard",
  stats: { affection: 10, popularity: 5, mood: 65, money: 1500, secrecy: 90, companyAlert: 20, careerPressure: 55 },
};

const hiddenManagerMemory: MemoryRecord = {
  id: "hidden-manager", gameId: state.gameId, week: 2, type: "hidden", content: "SECRET_MANAGER_ONLY_MARKER",
  actors: ["npc:manager", "sion"], tags: ["company"], importance: 4, emotion: null, visibility: "hidden",
  knownBy: ["npc:manager"], source: { kind: "outcome", settlementId: "hidden-settlement" }, createdAtSequence: 1,
};

function storyInput(memories: MemoryRecord[] = []) {
  return buildStoryGenerationInput({ gameState: state, currentEvent: null, eventHistory: [] as EventHistoryEntry[], memories, storyFlags: flags, viewerId: "player" });
}

function config(overrides: Partial<QwenServerConfig> = {}): QwenServerConfig {
  return {
    apiKey: "server-secret-test-key",
    baseUrl: "https://workspace.example.com/compatible-mode/v1",
    actionModel: "qwen3.7-flash",
    storyModel: "qwen3.7-plus",
    enableThinking: false,
    actionMaxCompletionTokens: 650,
    storyMaxCompletionTokens: 2000,
    actionTimeoutMs: 1000,
    storyTimeoutMs: 1000,
    maxRetries: 1,
    ...overrides,
  };
}

const validAction = {
  intentSummary: "玩家希望暂时拉开距离并稍后联系。",
  actionType: "other",
  targetActorIds: ["sion"],
  semanticTags: ["self_protection", "keep_distance", "temporary_distance"],
  romanticIntensity: "low",
  publicExposure: "high",
  boundaryRisk: "low",
  confidence: 0.94,
};

const validStory = {
  title: "拥挤人群之外",
  story: "你先退开半步，把这次接触留在安全的边界里。",
  choices: [{ id: "A", text: "先离开" }, { id: "B", text: "礼貌回应" }, { id: "C", text: "继续工作" }],
  suggestedEffects: [{ stat: "secrecy", magnitude: "small_positive", reason: "主动降低公开风险" }],
  suggestedChoiceTags: ["keep_distance"],
  suggestedOutcomeTags: [],
  memoryCandidates: [{ type: "short_term", summary: "玩家在人群中主动保持距离。", actors: ["player", "sion"], tags: ["privacy"], importance: 2 }],
};

function response(content: unknown, model: string, usage = { prompt_tokens: 120, completion_tokens: 80, total_tokens: 200 }, status = 200) {
  return new Response(JSON.stringify(status === 200
    ? { model, choices: [{ message: { content: JSON.stringify(content) } }], usage }
    : { error: { message: "upstream failure" } }), { status, headers: { "Content-Type": "application/json" } });
}

test("qwen mode with missing API key or base URL fails before any request", () => {
  assert.throws(() => createServerAIProvider({ AI_MODE: "qwen", DASHSCOPE_BASE_URL: "https://example.com/v1" }), /API key is missing/);
  assert.throws(() => createServerAIProvider({ AI_MODE: "qwen", DASHSCOPE_API_KEY: "secret" }), /base URL is missing/);
});

test("mock mode never needs Qwen configuration or external HTTP", async () => {
  const provider = createServerAIProvider({ AI_MODE: "mock" });
  const result = await provider.generateStory(storyInput());
  assert.equal(result.metadata.provider, "mock");
  assert.equal(result.metadata.usage.totalTokens, null);
});

test("valid Qwen action interpretation passes strict schema and reports usage", async () => {
  let requestBody = "";
  const provider = new QwenAIProvider(config(), async (_url, init) => {
    requestBody = String(init?.body);
    return response(validAction, "qwen3.7-flash");
  });
  const input = buildActionInterpretationInput(storyInput(), "这里人太多了，我先和他拉开一点距离，晚点再联系。");
  const result = await provider.interpretAction(input);
  assert.equal(result.data.actionType, "other");
  assert.deepEqual(result.data.semanticTags, ["self_protection", "keep_distance", "temporary_distance"]);
  assert.deepEqual(result.metadata.usage, { inputTokens: 120, outputTokens: 80, totalTokens: 200 });
  const sent = JSON.parse(requestBody);
  assert.equal(sent.enable_thinking, false);
  assert.equal(sent.max_completion_tokens, 650);
  assert.equal(sent.response_format.type, "json_schema");
  assert.equal(sent.response_format.json_schema.strict, true);
});

test("invalid action enum and unknown semantic tag receive one bounded schema retry", async () => {
  let calls = 0;
  const provider = new QwenAIProvider(config(), async () => {
    calls += 1;
    return response({ ...validAction, actionType: "teleport", semanticTags: ["invented_tag"] }, "qwen3.7-flash");
  });
  await assert.rejects(() => provider.interpretAction(buildActionInterpretationInput(storyInput(), "直接表白")), (error: unknown) => error instanceof QwenProviderError && error.code === "schema_validation_error");
  assert.equal(calls, 2);
});

test("valid story passes local validation and preserves token metadata", async () => {
  let requestBody = "";
  const provider = new QwenAIProvider(config(), async (_url, init) => {
    requestBody = String(init?.body);
    return response(validStory, "qwen3.7-plus");
  });
  const result = await provider.generateStory(storyInput());
  assert.equal(result.data.title, validStory.title);
  assert.equal(result.metadata.model, "qwen3.7-plus");
  assert.equal(result.metadata.latencyMs >= 0, true);
  assert.equal(result.metadata.usage.totalTokens, 200);
  const sent = JSON.parse(requestBody);
  assert.match(sent.messages[0].content, /NEW GAME FIRST TURN ONLY/);
  assert.match(sent.messages[0].content, /Do not use weather, season, sky, rain, wind, night, temperature/);
});

test("invalid story output is rejected locally", async () => {
  const provider = new QwenAIProvider(config(), async () => response({ ...validStory, finalAffection: 99 }, "qwen3.7-plus"));
  await assert.rejects(() => provider.generateStory(storyInput()), (error: unknown) => error instanceof QwenProviderError && error.code === "schema_validation_error");
});

test("Qwen payload excludes player-invisible Hidden Memory and results never expose the API key", async () => {
  let requestBody = "";
  const provider = new QwenAIProvider(config(), async (_url, init) => {
    requestBody = String(init?.body);
    return response(validStory, "qwen3.7-plus");
  });
  const input = storyInput([hiddenManagerMemory]);
  const before = structuredClone({ state, flags, memories: [hiddenManagerMemory] });
  const result = await provider.generateStory(input);
  assert.equal(requestBody.includes("SECRET_MANAGER_ONLY_MARKER"), false);
  assert.equal(JSON.stringify(result).includes("server-secret-test-key"), false);
  assert.deepEqual({ state, flags, memories: [hiddenManagerMemory] }, before);
});

test("client helper and Debug component contain no server API-key identifier", () => {
  const clientSources = [
    readFileSync(new URL("../ai/client.ts", import.meta.url), "utf8"),
    readFileSync(new URL("../components/game/ai-debug.tsx", import.meta.url), "utf8"),
  ].join("\n");
  assert.equal(clientSources.includes("DASHSCOPE_API_KEY"), false);
  assert.equal(clientSources.includes("server-secret-test-key"), false);
});

test("strict Qwen JSON Schema is derived from Zod without unsupported defaults", () => {
  const actionSchema = createQwenJSONSchema("action", actionInterpretationOutputSchema);
  const storySchema = createQwenJSONSchema("story", storyGenerationOutputSchema);
  assert.equal(actionSchema.json_schema.strict, true);
  assert.equal(actionSchema.json_schema.schema.additionalProperties, false);
  assert.equal(JSON.stringify(storySchema).includes('"default"'), false);
  assert.equal((storySchema.json_schema.schema.properties as Record<string, unknown>).title !== undefined, true);
});

test("transient 5xx retries once while authentication failures do not retry", async () => {
  let transientCalls = 0;
  const transient = new QwenAIProvider(config(), async () => {
    transientCalls += 1;
    return transientCalls === 1 ? response({}, "qwen3.7-plus", undefined, 500) : response(validStory, "qwen3.7-plus");
  });
  await transient.generateStory(storyInput());
  assert.equal(transientCalls, 2);

  let authCalls = 0;
  const auth = new QwenAIProvider(config(), async () => {
    authCalls += 1;
    return response({}, "qwen3.7-plus", undefined, 401);
  });
  await assert.rejects(() => auth.generateStory(storyInput()), (error: unknown) => error instanceof QwenProviderError && error.code === "authentication_error");
  assert.equal(authCalls, 1);
});
