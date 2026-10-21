import { AI_MODE } from "../config/ai.ts";
import type { AIProvider } from "./provider.ts";
import type { StoryGenerationInput, StoryGenerationOutput } from "./schemas.ts";
import { storyGenerationInputSchema, storyGenerationOutputSchema } from "./schemas.ts";

export class MockAIProvider implements AIProvider {
  readonly id = "mock";

  async generateStory(rawInput: StoryGenerationInput): Promise<StoryGenerationOutput> {
    const input = storyGenerationInputSchema.parse(rawInput);
    const { context } = input;
    const eventTitle = context.event?.title ?? "首尔的一段普通时间";
    const eventDescription = context.event?.description ?? "眼前的安排仍在继续，周围的人各自忙着自己的事情。";
    const riskCopy = context.ruleEvaluation.riskLevel === "low"
      ? "这次接触仍在合理边界内。"
      : "空气里留着没有说出口的顾虑，任何动作都可能被旁人重新解释。";
    const modeCopy = context.player.gameMode.id === "healing"
      ? "你也没有忘记照顾自己的节奏。"
      : context.player.gameMode.id === "pressure"
        ? "远处的目光让现场显得比平时更紧。"
        : "现实的安排没有因为这一刻而暂停。";
    const output = {
      title: eventTitle,
      story: `${eventDescription}\n\n${context.maleLead.name}的反应保持在“${context.gameState.relationshipStage}”阶段允许的范围内。${riskCopy}${modeCopy}`,
      choices: [
        { id: "A", text: "先确认周围环境，再礼貌回应。" },
        { id: "B", text: "保持自然，把话题留在当前事件上。" },
        { id: "C", text: "暂时退开，继续处理自己的安排。" },
      ],
      suggestedEffects: [
        { stat: "mood", magnitude: "small_positive", reason: "玩家以可控方式面对当前情境。" },
        { stat: "companyAlert", magnitude: context.ruleEvaluation.riskLevel === "low" ? "none" : "small_positive", reason: "公开环境中的接触可能引起额外注意。" },
      ],
      suggestedChoiceTags: ["maintain_relationship"],
      suggestedOutcomeTags: [],
      memoryCandidates: [{
        type: "short_term",
        summary: `第 ${context.gameState.week} 周，玩家经历了“${eventTitle}”。`,
        actors: ["player", context.maleLead.id],
        tags: context.event?.tags.slice(0, 3) ?? ["daily-life"],
        importance: 2,
      }],
    } satisfies StoryGenerationOutput;

    // The mock follows the same schema boundary as a future remote provider.
    return storyGenerationOutputSchema.parse(output);
  }
}

const mockProvider = new MockAIProvider();

export function getAIProvider(): AIProvider {
  if (AI_MODE !== "mock") throw new Error(`Unsupported AI mode: ${String(AI_MODE)}`);
  return mockProvider;
}

export function createInvalidMockOutput(): unknown {
  return {
    title: "Invalid fixture",
    choices: [
      { id: "A", text: "重复选项一" },
      { id: "A", text: "重复选项二" },
      { id: "C", text: "选项三" },
    ],
    suggestedEffects: [{ stat: "finalAffection", magnitude: "huge_positive", reason: "非法最终状态" }],
    finalAffection: 100,
    memoryCandidates: [],
  };
}
