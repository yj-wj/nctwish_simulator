import type { AIUsage } from "../provider.ts";
import { QwenProviderError } from "./qwenProvider.ts";
import { AIConfigurationError } from "./serverConfig.ts";

export interface AIErrorPayload {
  code: string;
  message: string;
  retryable: boolean;
  metadata: {
    provider: "mock" | "qwen";
    model: string;
    latencyMs: number;
    usage: AIUsage;
    success: false;
  };
}

export function toAIErrorPayload(
  error: unknown,
  fallback: { provider: "mock" | "qwen"; model: string },
): { status: number; error: AIErrorPayload } {
  if (error instanceof QwenProviderError) {
    return {
      status: error.status,
      error: {
        code: error.code,
        message: error.message,
        retryable: error.retryable,
        metadata: { provider: "qwen", model: error.model, latencyMs: error.latencyMs, usage: { inputTokens: null, outputTokens: null, totalTokens: null }, success: false },
      },
    };
  }
  if (error instanceof AIConfigurationError) {
    return {
      status: 503,
      error: {
        code: error.code,
        message: error.message,
        retryable: false,
        metadata: { provider: fallback.provider, model: fallback.model, latencyMs: 0, usage: { inputTokens: null, outputTokens: null, totalTokens: null }, success: false },
      },
    };
  }
  const message = error instanceof Error ? error.message : "Unexpected AI server error.";
  return {
    status: 500,
    error: {
      code: "internal_error",
      message,
      retryable: false,
      metadata: { provider: fallback.provider, model: fallback.model, latencyMs: 0, usage: { inputTokens: null, outputTokens: null, totalTokens: null }, success: false },
    },
  };
}
