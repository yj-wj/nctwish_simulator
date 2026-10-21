import { AI_PROVIDER_DEFAULTS, DEFAULT_AI_MODE, type AIMode } from "../../config/ai.ts";

export interface QwenServerConfig {
  apiKey: string;
  baseUrl: string;
  actionModel: string;
  storyModel: string;
  chatModel: string;
  enableThinking: boolean;
  actionMaxCompletionTokens: number;
  storyMaxCompletionTokens: number;
  chatMaxCompletionTokens: number;
  actionTimeoutMs: number;
  storyTimeoutMs: number;
  chatTimeoutMs: number;
  maxRetries: number;
}

export interface ServerAIConfig {
  mode: AIMode;
  qwen: QwenServerConfig | null;
  publicStatus: {
    mode: AIMode;
    provider: "mock" | "qwen";
    actionModel: string;
    storyModel: string;
    chatModel: string;
    configured: boolean;
    enableThinking: boolean;
    missing: Array<"apiKey" | "baseUrl">;
  };
}

export class AIConfigurationError extends Error {
  readonly code = "configuration_error";
  constructor(message: string) {
    super(message);
    this.name = "AIConfigurationError";
  }
}

export function readServerAIConfig(env: NodeJS.ProcessEnv = process.env): ServerAIConfig {
  const rawMode = env.AI_MODE?.trim() || DEFAULT_AI_MODE;
  if (rawMode !== "mock" && rawMode !== "qwen") {
    throw new AIConfigurationError(`Unsupported AI_MODE '${rawMode}'. Expected mock or qwen.`);
  }
  const actionModel = env.ACTION_MODEL?.trim() || AI_PROVIDER_DEFAULTS.actionModel;
  const storyModel = env.STORY_MODEL?.trim() || AI_PROVIDER_DEFAULTS.storyModel;
  const chatModel = env.CHAT_MODEL?.trim() || storyModel;
  const apiKey = env.DASHSCOPE_API_KEY?.trim() || "";
  const baseUrl = env.DASHSCOPE_BASE_URL?.trim() || "";
  const missing: Array<"apiKey" | "baseUrl"> = [];
  if (!apiKey) missing.push("apiKey");
  if (!baseUrl) missing.push("baseUrl");
  const configured = rawMode === "mock" || missing.length === 0;
  const qwen = missing.length === 0 ? {
    apiKey,
    baseUrl,
    actionModel,
    storyModel,
    chatModel,
    enableThinking: AI_PROVIDER_DEFAULTS.enableThinking,
    actionMaxCompletionTokens: AI_PROVIDER_DEFAULTS.actionMaxCompletionTokens,
    storyMaxCompletionTokens: AI_PROVIDER_DEFAULTS.storyMaxCompletionTokens,
    chatMaxCompletionTokens: AI_PROVIDER_DEFAULTS.chatMaxCompletionTokens,
    actionTimeoutMs: AI_PROVIDER_DEFAULTS.actionTimeoutMs,
    storyTimeoutMs: AI_PROVIDER_DEFAULTS.storyTimeoutMs,
    chatTimeoutMs: AI_PROVIDER_DEFAULTS.chatTimeoutMs,
    maxRetries: AI_PROVIDER_DEFAULTS.maxRetries,
  } : null;
  return {
    mode: rawMode,
    qwen,
    publicStatus: {
      mode: rawMode,
      provider: rawMode,
      actionModel,
      storyModel,
      chatModel,
      configured,
      enableThinking: AI_PROVIDER_DEFAULTS.enableThinking,
      missing,
    },
  };
}

export function requireQwenConfig(config: ServerAIConfig): QwenServerConfig {
  if (config.qwen) return config.qwen;
  const missing = config.publicStatus.missing.map((item) => item === "apiKey" ? "API key" : "base URL").join(" and ");
  throw new AIConfigurationError(`Qwen is selected but ${missing || "required configuration"} is missing.`);
}
