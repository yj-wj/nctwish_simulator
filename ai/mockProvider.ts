import type { AIProvider } from "./provider.ts";
import type { ActionInterpretationInput, ActionInterpretationOutput, StoryGenerationInput, StoryGenerationOutput } from "./schemas.ts";
import { actionInterpretationInputSchema, actionInterpretationOutputSchema, storyGenerationInputSchema, storyGenerationOutputSchema } from "./schemas.ts";
import { chatGenerationInputSchema, chatGenerationOutputSchema, type ChatGenerationInput, type ChatGenerationOutput } from "./chatSchemas.ts";
import { snsGenerationInputSchema, snsGenerationOutputSchema, type SNSGenerationInput, type SNSGenerationOutput } from "./snsSchemas.ts";

export class MockAIProvider implements AIProvider {
  readonly id = "mock";

  async generateStory(rawInput: StoryGenerationInput) {
    const input = storyGenerationInputSchema.parse(rawInput);
    const { context } = input;
    const eventTitle = context.event?.title ?? "首尔的一段普通时间";
    const eventDescription = context.event?.description ?? "眼前的安排仍在继续，周围的人各自忙着自己的事情。";
    const relationshipMismatch = context.ruleEvaluation.warnings.some((warning) =>
      warning === "rejectionLikely" || warning === "awkwardReactionLikely");
    const secrecyRisk = context.ruleEvaluation.warnings.includes("secrecyRisk");
    const riskCopy = relationshipMismatch
      ? "这份突然越过关系边界的表达没有被直接接受。他停顿片刻，礼貌而明确地拉开了距离。"
      : context.ruleEvaluation.riskLevel === "low"
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
        ...(relationshipMismatch ? [{ stat: "affection" as const, magnitude: "small_negative" as const, reason: "越过当前关系边界导致对方拉开距离。" }] : []),
        ...(secrecyRisk ? [{ stat: "secrecy" as const, magnitude: "small_negative" as const, reason: "公开互动提高了被注意的风险。" }] : []),
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
    return {
      data: storyGenerationOutputSchema.parse(output),
      metadata: {
        provider: "mock" as const,
        model: "mock-story-v1",
        latencyMs: 0,
        usage: { inputTokens: null, outputTokens: null, totalTokens: null },
        success: true as const,
      },
    };
  }

  async interpretAction(rawInput: ActionInterpretationInput) {
    const input = actionInterpretationInputSchema.parse(rawInput);
    const text = input.playerText;
    const isConfession = /表白|喜欢你|爱你/.test(text);
    const keepsDistance = /距离|离开|退开|晚点|暂时/.test(text);
    const output = {
      intentSummary: keepsDistance ? "玩家希望暂时保持距离并降低公开风险。" : isConfession ? "玩家希望直接表达感情。" : "玩家希望以当前关系边界继续互动。",
      actionType: isConfession ? "confession" : keepsDistance ? "other" : "politeConversation",
      targetActorIds: [input.context.knownActorIds[1]],
      semanticTags: keepsDistance ? ["self_protection", "keep_distance", "temporary_distance"] : isConfession ? ["maintain_relationship"] : ["maintain_relationship"],
      romanticIntensity: isConfession ? "high" : "low",
      publicExposure: /人太多|公开|镜头|粉丝/.test(text) ? "high" : "low",
      boundaryRisk: isConfession && input.context.relationshipStage === "strangers" ? "high" : keepsDistance ? "low" : "medium",
      confidence: 0.82,
    } satisfies ActionInterpretationOutput;
    return {
      data: actionInterpretationOutputSchema.parse(output),
      metadata: {
        provider: "mock" as const,
        model: "mock-action-v1",
        latencyMs: 0,
        usage: { inputTokens: null, outputTokens: null, totalTokens: null },
        success: true as const,
      },
    };
  }

  async generateChat(rawInput: ChatGenerationInput) {
    const input = chatGenerationInputSchema.parse(rawInput);
    const text = input.playerMessage ?? "";
    const intimate = /宝宝|去你家|睡|爱你|想你/.test(text);
    const important = /不要突然消失|害怕.*失联|希望你以后/.test(text);
    const mismatch = input.context.ruleEvaluation.violatedRules.includes("relationshipMismatch");
    const messages = input.mode === "incoming"
      ? [input.incomingReason === "exposure_concern" ? "刚才的事我看到了。你现在还好吗？" : input.incomingReason === "career_pressure_check_in" ? "今天应该很累吧。忙完记得告诉我一声。" : "刚才没来得及好好说。你到家了吗？"]
      : mismatch || (intimate && input.context.gameState.relationshipStage === "strangers")
        ? ["我们还没有熟到可以这样说。", "如果有事情，可以直接讲。"]
        : /晚安/.test(text)
          ? ["晚安。早点休息。"]
          : ["看到了。", "你不用担心，我忙完会回复。"];
    const output: ChatGenerationOutput = {
      messages,
      effectCategory: important ? "relationship" : "none",
      suggestedEffects: important ? [{ stat: "affection", magnitude: "small_positive", reason: "玩家清楚表达了重要的关系需求。" }] : [],
      suggestedChoiceTags: important ? ["maintain_relationship"] : [],
      suggestedOutcomeTags: [],
      memoryCandidates: important ? [{ type: "relationship", summary: "玩家明确表示自己害怕重要的人突然失联。", actors: ["player", input.context.maleLead.id], tags: ["relationship", "communication"], importance: 4 }] : [],
    };
    return { data: chatGenerationOutputSchema.parse(output), metadata: { provider: "mock" as const, model: "mock-chat-v1", latencyMs: 0, usage: { inputTokens: null, outputTokens: null, totalTokens: null }, success: true as const } };
  }

  async generateSNS(rawInput: SNSGenerationInput) {
    const input = snsGenerationInputSchema.parse(rawInput);
    const { trigger } = input.context;
    const company = trigger.reason === "company_statement";
    const exposure = ["exposure_leak", "paparazzi_exposure", "relationship_rumor"].includes(trigger.reason);
    const output: SNSGenerationOutput = {
      posts: [{
        authorId: company ? "official-company" : exposure ? "dispatch-watch" : "garden-update",
        authorName: company ? "公司官方" : exposure ? "娱乐观察" : "花园资讯站",
        handle: company ? "@official_notice" : exposure ? "@scene_watch" : "@garden_update",
        accountType: company ? "company" : exposure ? "media" : trigger.allowedAccountTypes[0],
        content: company ? `公司就“${trigger.publicTitle}”发布说明，请以官方信息为准。` : exposure ? `关于“${trigger.publicTitle}”的公开画面正在引发讨论，目前仍没有足够信息确认更多细节。` : `${trigger.publicTitle}引起关注：${trigger.publicSummary}`,
        visibility: "public",
        sentiment: trigger.level === "crisis" ? "negative" : trigger.level === "attention" ? "positive" : "mixed",
        topicTags: trigger.allowedTopicTags,
      }],
    };
    return { data: snsGenerationOutputSchema.parse(output), metadata: { provider: "mock" as const, model: "mock-sns-v1", latencyMs: 0, usage: { inputTokens: null, outputTokens: null, totalTokens: null }, success: true as const } };
  }
}

const mockProvider = new MockAIProvider();

export function getAIProvider(): AIProvider {
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
