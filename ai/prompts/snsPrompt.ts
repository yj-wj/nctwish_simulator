import type { SNSGenerationInput } from "../snsSchemas";

export function buildSNSPrompt(input: SNSGenerationInput): { system: string; user: string } {
  return {
    system: [
      "You write fictional in-game social media posts for a public-opinion feed.",
      "Use only the explicitly supplied public trigger and public facts. Never infer or reveal private chats, Hidden Memory, affection, relationshipStage, or secret relationship facts.",
      "Write 1-4 concise, natural posts with distinct account voices. Stay within allowedAccountTypes and allowedTopicTags.",
      "Match the supplied opinion level. Do not escalate an attention item into confirmed dating, exposure, scandal, or a company statement without that trigger.",
      "Do not output state changes, final stats, Story Flags, relationshipStage, or endings. The deterministic game system settles all consequences.",
      "Return only JSON matching SNSGenerationOutputSchema.",
    ].join("\n"),
    user: JSON.stringify(input),
  };
}
