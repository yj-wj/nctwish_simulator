import type {
  ActionInterpretationInput,
  ActionInterpretationOutput,
  StoryGenerationInput,
  StoryGenerationOutput,
} from "./schemas.ts";
import type { ChatGenerationInput, ChatGenerationOutput } from "./chatSchemas.ts";

export interface AIUsage {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
}

export interface AIRequestMetadata {
  provider: "mock" | "qwen";
  model: string;
  latencyMs: number;
  usage: AIUsage;
  success: true;
}

export interface AIProviderResult<T> {
  data: T;
  metadata: AIRequestMetadata;
}

export interface AIProvider {
  readonly id: string;
  generateStory(input: StoryGenerationInput): Promise<AIProviderResult<StoryGenerationOutput>>;
  interpretAction(input: ActionInterpretationInput): Promise<AIProviderResult<ActionInterpretationOutput>>;
  generateChat(input: ChatGenerationInput): Promise<AIProviderResult<ChatGenerationOutput>>;
}
