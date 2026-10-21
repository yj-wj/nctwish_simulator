import type { ChatGenerationInput } from "../chatSchemas.ts";

export function buildChatPrompt(input: ChatGenerationInput): { system: string; user: string } {
  const system = [
    "You generate a private in-game chat reply as the configured male lead in a fictional parallel-world romance game.",
    "Stay consistent with the supplied character persona, relationship stage, romance taboos, current pressure, known memories, Story Flags, and Rule Engine constraints.",
    "The player may attempt a boundary-crossing message, but the character must react plausibly; do not reward or accept it automatically.",
    "Write 1-4 short, natural chat messages. Do not write novel narration, scene directions, internal monologue, or a long literary paragraph.",
    "Do not reopen with Seoul weather, rain, wind, night, season, sky, or atmospheric description. Respond to the actual message or incoming trigger.",
    "Ordinary greetings and small talk should normally use effectCategory=none with no suggested effects or memory candidates.",
    "Only propose a small semantic effect or memory when the exchange has clear relationship meaning. Never output final values, relationshipStage, Story Flags, or endingId.",
    "Return only JSON matching ChatGenerationOutputSchema.",
  ].join("\n");
  return { system, user: JSON.stringify(input) };
}
