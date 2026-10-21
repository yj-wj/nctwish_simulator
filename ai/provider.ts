import type { StoryGenerationInput, StoryGenerationOutput } from "./schemas.ts";

export interface AIProvider {
  readonly id: string;
  generateStory(input: StoryGenerationInput): Promise<StoryGenerationOutput>;
}
