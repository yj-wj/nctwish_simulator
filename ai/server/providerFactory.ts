import type { AIProvider } from "../provider.ts";
import { MockAIProvider } from "../mockProvider.ts";
import { QwenAIProvider } from "./qwenProvider.ts";
import { readServerAIConfig, requireQwenConfig } from "./serverConfig.ts";

export function createServerAIProvider(env: NodeJS.ProcessEnv = process.env): AIProvider {
  const config = readServerAIConfig(env);
  return config.mode === "mock" ? new MockAIProvider() : new QwenAIProvider(requireQwenConfig(config));
}
