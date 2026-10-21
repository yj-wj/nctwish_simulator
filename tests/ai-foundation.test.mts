import assert from "node:assert/strict";
import { test } from "node:test";
import { AI_CONTEXT_BUDGET, AI_MODE, STORY_PROMPT_VERSION } from "../config/ai.ts";
import { getEventTemplate } from "../config/event-pool.ts";
import { buildStoryGenerationInput } from "../game/contextBuilder.ts";
import { getAIProvider, createInvalidMockOutput } from "../ai/mockProvider.ts";
import { buildStoryPrompt } from "../ai/prompts/storyPrompt.ts";
import { validateStoryOutput } from "../ai/outputValidator.ts";
import { storyGenerationInputSchema, storyGenerationOutputSchema } from "../ai/schemas.ts";
import type { EventHistoryEntry } from "../types/event.ts";
import type { GameState } from "../types/game.ts";
import type { StoryFlagState } from "../types/history.ts";
import type { MemoryRecord } from "../types/memory.ts";

const storyFlags: StoryFlagState = {
  relationshipConfirmed: true,
  formalBreakup: false,
  majorExposureOccurred: false,
  publicOpinionOutOfControl: false,
  publicRevealEventTriggered: false,
  publicRevealSucceeded: false,
  unresolvedMajorCrisis: false,
  separationPressureActive: false,
  playerChoseLeave: false,
  playerChoseSeparation: false,
  forcedSeparation: false,
  relationshipFailedDuringExposure: false,
  playerCareerStable: false,
};

function makeState(affection = 10): GameState {
  return {
    gameId: "ai-test",
    week: 12,
    currentScene: "首尔汝矣岛电视台后门",
    careerStage: "回归期",
    player: { name: "测试玩家", age: 24, identityId: "student", fanLevelId: "passerby" },
    maleLead: "sion",
    gameMode: "standard",
    stats: { affection, popularity: 20, mood: 65, money: 1800, secrecy: 80, companyAlert: 30, careerPressure: 55 },
  };
}

function eventHistory(count = 7): EventHistoryEntry[] {
  return Array.from({ length: count }, (_, index) => ({
    recordId: `record-${index + 1}`,
    eventId: `event-${index + 1}`,
    week: index + 1,
    category: "daily",
    eventTags: ["daily-life"],
    outcomeTags: [],
    status: "resolved",
    flagEffects: [],
  }));
}

function memory(index: number, overrides: Partial<MemoryRecord> = {}): MemoryRecord {
  return {
    id: `memory-${index}`,
    gameId: "ai-test",
    week: index,
    type: "relationship",
    content: `记忆 ${index}`,
    actors: ["player", "sion"],
    tags: ["relationship-progress"],
    importance: Math.min(5, Math.max(1, index)) as 1 | 2 | 3 | 4 | 5,
    emotion: null,
    visibility: "shared",
    knownBy: ["player", "sion"],
    source: { kind: "outcome", settlementId: `settlement-${index}` },
    createdAtSequence: index,
    ...overrides,
  };
}

function build(viewerId: "player" | "npc:manager" = "player", overrides: { memories?: MemoryRecord[]; events?: EventHistoryEntry[]; affection?: number } = {}) {
  return buildStoryGenerationInput({
    gameState: makeState(overrides.affection ?? 10),
    currentEvent: getEventTemplate("airport_fan_crowding") ?? getEventTemplate("comeback_mv_shoot") ?? null,
    eventHistory: overrides.events ?? eventHistory(),
    memories: overrides.memories ?? [],
    storyFlags,
    viewerId,
    playerAction: { type: "continue" },
  });
}

function validOutput() {
  return {
    title: "合法输出",
    story: "这是一段符合结构的 Mock 剧情。",
    choices: [
      { id: "A", text: "选择 A" },
      { id: "B", text: "选择 B" },
      { id: "C", text: "选择 C" },
    ],
    suggestedEffects: [{ stat: "affection", magnitude: "small_positive", reason: "一次克制的友好互动" }],
    suggestedChoiceTags: ["maintain_relationship"],
    suggestedOutcomeTags: [],
    memoryCandidates: [{ type: "short_term", summary: "发生了一次短暂交谈。", actors: ["player", "sion"], tags: ["daily"], importance: 2 }],
  } as const;
}

test("Context Builder includes the current player, male lead, state, event and rule constraints", () => {
  const input = build();
  assert.equal(storyGenerationInputSchema.safeParse(input).success, true);
  assert.equal(input.context.player.name, "测试玩家");
  assert.equal(input.context.maleLead.id, "sion");
  assert.equal(input.context.gameState.week, 12);
  assert.ok(input.context.event);
  assert.equal(input.context.gameState.relationshipStage, "strangers");
  assert.equal(input.context.ruleEvaluation.allowedInteractionLevel, "formal");
  assert.ok(input.context.ruleEvaluation.prohibitedInteractions.length > 0);
  assert.deepEqual(input.context.storyFacts, ["relationshipConfirmed"]);
});

test("Context budgets limit recent events and relevant memories", () => {
  const memories = Array.from({ length: 10 }, (_, index) => memory(index + 1));
  const input = build("player", { memories, events: eventHistory(9) });
  assert.equal(input.context.recentEvents.length, AI_CONTEXT_BUDGET.recentEvents);
  assert.equal(input.context.relevantMemories.length, AI_CONTEXT_BUDGET.relevantMemories);
  assert.equal(input.context.diagnostics.excludedOlderEvents, 5);
  assert.equal(input.context.diagnostics.excludedMemoriesByLimit, 4);
  assert.deepEqual(input.context.recentEvents.map(({ week }) => week), [9, 8, 7, 6]);
});

test("player context excludes manager-only hidden memory while manager context may include it", () => {
  const hidden = memory(8, {
    id: "manager-secret",
    type: "hidden",
    content: "经纪人已在内部讨论限制接触。",
    actors: ["npc:manager"],
    visibility: "hidden",
    knownBy: ["npc:manager"],
  });
  const playerInput = build("player", { memories: [memory(7), hidden] });
  const managerInput = build("npc:manager", { memories: [memory(7), hidden] });
  assert.equal(playerInput.context.relevantMemories.some(({ id }) => id === hidden.id), false);
  assert.equal(playerInput.context.diagnostics.excludedMemoriesByVisibility, 1);
  assert.equal(managerInput.context.relevantMemories.some(({ id }) => id === hidden.id), true);
});

test("MockAIProvider uses mock mode and returns schema-valid output", async () => {
  const output = await getAIProvider().generateStory(build());
  assert.equal(AI_MODE, "mock");
  assert.equal(storyGenerationOutputSchema.safeParse(output).success, true);
  assert.equal(output.choices.length, 3);
});

test("invalid fixture and forbidden final-state fields are rejected", () => {
  const input = build();
  assert.equal(validateStoryOutput(createInvalidMockOutput(), input).success, false);
  assert.equal(validateStoryOutput({ ...validOutput(), finalAffection: 100 }, input).success, false);
});

test("duplicate choice ids are rejected", () => {
  const output = validOutput();
  const duplicate = { ...output, choices: [{ id: "A", text: "A1" }, { id: "A", text: "A2" }, { id: "C", text: "C" }] };
  assert.equal(validateStoryOutput(duplicate, build()).success, false);
});

test("invalid effect stat and magnitude are rejected", () => {
  const output = { ...validOutput(), suggestedEffects: [{ stat: "endingId", magnitude: "huge", reason: "invalid" }] };
  assert.equal(validateStoryOutput(output, build()).success, false);
});

test("unknown memory candidate actor is rejected", () => {
  const output = { ...validOutput(), memoryCandidates: [{ ...validOutput().memoryCandidates[0], actors: ["npc:unknown"] }] };
  const result = validateStoryOutput(output, build());
  assert.equal(result.success, false);
  if (!result.success) assert.ok(result.issues.some((issue) => issue.includes("unknown actor")));
});

test("public confession suggestion in stranger stage produces a structural warning", () => {
  const output = { ...validOutput(), suggestedChoiceTags: ["public_confession"] };
  const result = validateStoryOutput(output, build("player", { affection: 10 }));
  assert.equal(result.success, true);
  if (result.success) assert.deepEqual(result.warnings, ["relationship_stage_mismatch"]);
});

test("prompt is modular and versioned", () => {
  const prompt = buildStoryPrompt(build());
  assert.equal(prompt.promptVersion, STORY_PROMPT_VERSION);
  assert.deepEqual(prompt.sections.map(({ id }) => id), [
    "SYSTEM_RULES", "CHARACTER_INSTRUCTIONS", "STATE_CONTEXT", "MEMORY_CONTEXT", "EVENT_CONTEXT", "OUTPUT_INSTRUCTIONS",
  ]);
});

test("story generation does not mutate state, history, flags or memory", async () => {
  const gameState = makeState();
  const events = eventHistory();
  const flags = structuredClone(storyFlags);
  const memories = [memory(3)];
  const before = structuredClone({ gameState, events, flags, memories });
  const input = buildStoryGenerationInput({ gameState, currentEvent: null, eventHistory: events, memories, storyFlags: flags, viewerId: "player" });
  const output = await getAIProvider().generateStory(input);
  assert.equal(validateStoryOutput(output, input).success, true);
  assert.deepEqual({ gameState, events, flags, memories }, before);
});
