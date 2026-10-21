import type { AIProvider, AIProviderResult, AIUsage } from "../provider.ts";
import { actionInterpretationInputSchema, actionInterpretationOutputSchema, storyGenerationInputSchema, storyGenerationOutputSchema, type ActionInterpretationInput, type ActionInterpretationOutput, type StoryGenerationInput, type StoryGenerationOutput } from "../schemas.ts";
import { buildActionPrompt } from "../prompts/actionPrompt.ts";
import { buildStoryPrompt } from "../prompts/storyPrompt.ts";
import { createQwenJSONSchema } from "../jsonSchema.ts";
import { validateActionInterpretationOutput } from "../actionValidator.ts";
import { validateStoryOutput } from "../outputValidator.ts";
import type { QwenServerConfig } from "./serverConfig.ts";

export type QwenErrorCode = "network_error" | "timeout" | "authentication_error" | "rate_limit" | "upstream_error" | "malformed_response" | "schema_validation_error";

export class QwenProviderError extends Error {
  readonly code: QwenErrorCode;
  readonly status: number;
  readonly retryable: boolean;
  readonly model: string;
  readonly latencyMs: number;

  constructor(
    code: QwenErrorCode,
    message: string,
    status: number,
    retryable: boolean,
    model: string,
    latencyMs: number,
  ) {
    super(message);
    this.name = "QwenProviderError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
    this.model = model;
    this.latencyMs = latencyMs;
  }
}

interface QwenResponseBody {
  model?: string;
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
  };
  error?: { message?: string; code?: string };
}

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

function endpoint(baseUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error("Qwen base URL is invalid.");
  }
  if (!/^https?:$/.test(parsed.protocol)) throw new Error("Qwen base URL must use HTTP or HTTPS.");
  const normalized = parsed.toString().replace(/\/$/, "");
  return normalized.endsWith("/chat/completions") ? normalized : `${normalized}/chat/completions`;
}

function usageOf(body: QwenResponseBody): AIUsage {
  const usage = body.usage;
  return {
    inputTokens: usage?.prompt_tokens ?? usage?.input_tokens ?? null,
    outputTokens: usage?.completion_tokens ?? usage?.output_tokens ?? null,
    totalTokens: usage?.total_tokens ?? null,
  };
}

function safeUpstreamMessage(body: QwenResponseBody, status: number, apiKey: string): string {
  const message = body.error?.message?.trim();
  const safeMessage = message?.replaceAll(apiKey, "[redacted]");
  return safeMessage ? `Qwen request failed (${status}): ${safeMessage.slice(0, 300)}` : `Qwen request failed with HTTP ${status}.`;
}

export class QwenAIProvider implements AIProvider {
  readonly id = "qwen";
  private readonly config: QwenServerConfig;
  private readonly fetchImpl: FetchLike;

  constructor(
    config: QwenServerConfig,
    fetchImpl: FetchLike = fetch,
  ) {
    this.config = config;
    this.fetchImpl = fetchImpl;
  }

  async interpretAction(rawInput: ActionInterpretationInput): Promise<AIProviderResult<ActionInterpretationOutput>> {
    const input = actionInterpretationInputSchema.parse(rawInput);
    const prompt = buildActionPrompt(input);
    for (let schemaAttempt = 0; schemaAttempt <= this.config.maxRetries; schemaAttempt += 1) {
      const response = await this.request({
        model: this.config.actionModel,
        timeoutMs: this.config.actionTimeoutMs,
        maxCompletionTokens: this.config.actionMaxCompletionTokens,
        messages: [{ role: "system", content: prompt.system }, { role: "user", content: prompt.user }],
        responseFormat: createQwenJSONSchema("action_interpretation", actionInterpretationOutputSchema),
      });
      let parsed: unknown;
      try {
        parsed = this.parseContent(response.body, response.model, response.latencyMs);
      } catch (error) {
        if (error instanceof QwenProviderError && error.code === "malformed_response" && schemaAttempt < this.config.maxRetries) continue;
        throw error;
      }
      const validation = validateActionInterpretationOutput(parsed, input);
      if (validation.success) {
        return { data: validation.data, metadata: { provider: "qwen", model: response.model, latencyMs: response.latencyMs, usage: usageOf(response.body), success: true } };
      }
      if (schemaAttempt === this.config.maxRetries) {
        throw new QwenProviderError("schema_validation_error", `${validation.message}: ${validation.issues.join(" | ")}`, 502, false, response.model, response.latencyMs);
      }
    }
    throw new QwenProviderError("schema_validation_error", "Action validation failed.", 502, false, this.config.actionModel, 0);
  }

  async generateStory(rawInput: StoryGenerationInput): Promise<AIProviderResult<StoryGenerationOutput>> {
    const input = storyGenerationInputSchema.parse(rawInput);
    const prompt = buildStoryPrompt(input);
    const textInstructionIds = new Set(["SYSTEM_RULES", "CONTINUITY_INSTRUCTIONS", "OUTPUT_INSTRUCTIONS"]);
    const system = prompt.sections
      .filter(({ id }) => textInstructionIds.has(id))
      .map(({ content }) => content)
      .join("\n\n");
    const user = JSON.stringify(Object.fromEntries(prompt.sections
      .filter(({ id }) => !textInstructionIds.has(id))
      .map(({ id, content }) => [id, JSON.parse(content)])));
    for (let schemaAttempt = 0; schemaAttempt <= this.config.maxRetries; schemaAttempt += 1) {
      const response = await this.request({
        model: this.config.storyModel,
        timeoutMs: this.config.storyTimeoutMs,
        maxCompletionTokens: this.config.storyMaxCompletionTokens,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        responseFormat: createQwenJSONSchema("story_generation", storyGenerationOutputSchema),
      });
      let parsed: unknown;
      try {
        parsed = this.parseContent(response.body, response.model, response.latencyMs);
      } catch (error) {
        if (error instanceof QwenProviderError && error.code === "malformed_response" && schemaAttempt < this.config.maxRetries) continue;
        throw error;
      }
      const validation = validateStoryOutput(parsed, input);
      if (validation.success) {
        return { data: validation.data, metadata: { provider: "qwen", model: response.model, latencyMs: response.latencyMs, usage: usageOf(response.body), success: true } };
      }
      if (schemaAttempt === this.config.maxRetries) {
        throw new QwenProviderError("schema_validation_error", `${validation.message}: ${validation.issues.join(" | ")}`, 502, false, response.model, response.latencyMs);
      }
    }
    throw new QwenProviderError("schema_validation_error", "Story validation failed.", 502, false, this.config.storyModel, 0);
  }

  private parseContent(body: QwenResponseBody, model: string, latencyMs: number): unknown {
    const content = body.choices?.[0]?.message?.content;
    if (!content) throw new QwenProviderError("malformed_response", "Qwen returned no message content.", 502, false, model, latencyMs);
    try {
      return JSON.parse(content);
    } catch {
      throw new QwenProviderError("malformed_response", "Qwen returned malformed JSON content.", 502, false, model, latencyMs);
    }
  }

  private async request(options: {
    model: string;
    timeoutMs: number;
    maxCompletionTokens: number;
    messages: Array<{ role: "system" | "user"; content: string }>;
    responseFormat: ReturnType<typeof createQwenJSONSchema>;
  }): Promise<{ body: QwenResponseBody; model: string; latencyMs: number }> {
    const startedAt = Date.now();
    const url = endpoint(this.config.baseUrl);
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options.timeoutMs);
      try {
        const response = await this.fetchImpl(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${this.config.apiKey}`, "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            model: options.model,
            messages: options.messages,
            response_format: options.responseFormat,
            enable_thinking: this.config.enableThinking,
            max_completion_tokens: options.maxCompletionTokens,
          }),
        });
        let body: QwenResponseBody = {};
        try { body = await response.json() as QwenResponseBody; } catch { /* handled below */ }
        if (!response.ok) {
          const retryable = response.status === 429 || response.status >= 500;
          if (retryable && attempt < this.config.maxRetries) continue;
          const code = response.status === 401 || response.status === 403 ? "authentication_error" : response.status === 429 ? "rate_limit" : "upstream_error";
          throw new QwenProviderError(code, safeUpstreamMessage(body, response.status, this.config.apiKey), response.status, retryable, options.model, Date.now() - startedAt);
        }
        return { body, model: body.model || options.model, latencyMs: Date.now() - startedAt };
      } catch (error) {
        if (error instanceof QwenProviderError) throw error;
        const timedOut = error instanceof Error && error.name === "AbortError";
        if (attempt < this.config.maxRetries) continue;
        throw new QwenProviderError(timedOut ? "timeout" : "network_error", timedOut ? `Qwen request timed out after ${options.timeoutMs}ms.` : "Unable to reach the Qwen endpoint.", 504, true, options.model, Date.now() - startedAt);
      } finally {
        clearTimeout(timer);
      }
    }
    throw new QwenProviderError("network_error", "Qwen request failed.", 502, true, options.model, Date.now() - startedAt);
  }
}
