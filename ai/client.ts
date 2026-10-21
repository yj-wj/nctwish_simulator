import type { AIProviderResult } from "./provider";
import type { ActionInterpretationInput, ActionInterpretationOutput, StoryGenerationInput, StoryGenerationOutput } from "./schemas";
import type { ChatGenerationInput, ChatGenerationOutput } from "./chatSchemas";

export interface PublicAIStatus {
  mode: "mock" | "qwen";
  provider: "mock" | "qwen";
  actionModel: string;
  storyModel: string;
  chatModel: string;
  configured: boolean;
  enableThinking: boolean;
  missing: Array<"apiKey" | "baseUrl">;
}

export class AIClientError extends Error {
  readonly code: string;
  readonly metadata?: { provider: string; model: string; latencyMs: number; usage: { inputTokens: number | null; outputTokens: number | null; totalTokens: number | null }; success: false };

  constructor(
    code: string,
    message: string,
    metadata?: { provider: string; model: string; latencyMs: number; usage: { inputTokens: number | null; outputTokens: number | null; totalTokens: number | null }; success: false },
  ) {
    super(message);
    this.name = "AIClientError";
    this.code = code;
    this.metadata = metadata;
  }
}

async function readResponse<T>(response: Response): Promise<T> {
  let payload: { ok: boolean; result?: T; error?: { code?: string; message?: string; metadata?: AIClientError["metadata"] } };

  try {
    payload = await response.json() as typeof payload;
  } catch {
    throw new AIClientError(
      "malformed_server_response",
      `AI server returned a non-JSON response (HTTP ${response.status}).`,
    );
  }

  if (!response.ok || !payload.ok || !payload.result) {
    throw new AIClientError(payload.error?.code ?? "request_failed", payload.error?.message ?? `AI request failed with HTTP ${response.status}.`, payload.error?.metadata);
  }
  return payload.result;
}

export async function getAIStatus(): Promise<PublicAIStatus> {
  const response = await fetch("/api/ai/status", { cache: "no-store" });
  let payload: { ok: boolean; status?: PublicAIStatus; error?: { message?: string } };

  try {
    payload = await response.json() as typeof payload;
  } catch {
    throw new AIClientError(
      "malformed_server_response",
      `AI status endpoint returned a non-JSON response (HTTP ${response.status}).`,
    );
  }

  if (!response.ok || !payload.ok || !payload.status) throw new AIClientError("status_failed", payload.error?.message ?? "Unable to read AI status.");
  return payload.status;
}

export async function interpretActionWithServer(input: ActionInterpretationInput): Promise<AIProviderResult<ActionInterpretationOutput>> {
  return readResponse(await fetch("/api/ai/interpret-action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
}

export async function generateStoryWithServer(input: StoryGenerationInput): Promise<AIProviderResult<StoryGenerationOutput>> {
  return readResponse(await fetch("/api/ai/generate-story", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
}

export async function generateChatWithServer(input: ChatGenerationInput): Promise<AIProviderResult<ChatGenerationOutput>> {
  return readResponse(await fetch("/api/ai/generate-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
}
