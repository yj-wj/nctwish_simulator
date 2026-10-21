import assert from "node:assert/strict";
import { test } from "node:test";
import { initialStoryFlags } from "../config/history.ts";
import { buildActionInterpretationInput, buildStoryGenerationInput } from "../game/contextBuilder.ts";
import { createServerAIProvider } from "../ai/server/providerFactory.ts";
import type { GameState } from "../types/game.ts";

const live = process.env.RUN_LIVE_AI_TESTS === "true";
const gameState: GameState = {
  gameId: "live-smoke",
  week: 1,
  currentScene: "首尔汝矣岛电视台后门",
  careerStage: "回归期",
  player: { name: "Live Smoke Player", age: 24, identityId: "student", fanLevelId: "passerby" },
  maleLead: "sion",
  gameMode: "standard",
  stats: { affection: 8, popularity: 0, mood: 72, money: 2300, secrecy: 100, companyAlert: 18, careerPressure: 67 },
};
const storyInput = buildStoryGenerationInput({
  gameState,
  currentEvent: null,
  eventHistory: [],
  memories: [],
  storyFlags: initialStoryFlags,
  viewerId: "player",
  playerAction: { type: "continue" },
});

test("live qwen3.7-flash action interpretation", { skip: !live }, async () => {
  assert.equal(process.env.AI_MODE, "qwen", "Set AI_MODE=qwen for live tests.");
  const result = await createServerAIProvider().interpretAction(buildActionInterpretationInput(
    storyInput,
    "这里人太多了，我先和他拉开一点距离，晚点再联系。",
  ));
  assert.equal(result.metadata.provider, "qwen");
  assert.ok(result.data.intentSummary);
});

test("live qwen3.7-plus story generation", { skip: !live }, async () => {
  assert.equal(process.env.AI_MODE, "qwen", "Set AI_MODE=qwen for live tests.");
  const result = await createServerAIProvider().generateStory(storyInput);
  assert.equal(result.metadata.provider, "qwen");
  assert.equal(result.data.choices.length, 3);
});
