import "server-only";
import { NextResponse } from "next/server";
import { storyGenerationInputSchema } from "@/ai/schemas";
import { createServerAIProvider } from "@/ai/server/providerFactory";
import { toAIErrorPayload } from "@/ai/server/apiError";

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: { code: "invalid_request", message: "Request body must be valid JSON." } }, { status: 400 });
  }
  const parsed = storyGenerationInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: { code: "invalid_request", message: "Story input failed validation.", issues: parsed.error.issues } }, { status: 400 });
  }
  try {
    const result = await createServerAIProvider().generateStory(parsed.data);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const failure = toAIErrorPayload(error, {
      provider: process.env.AI_MODE === "qwen" ? "qwen" : "mock",
      model: process.env.STORY_MODEL?.trim() || "qwen3.7-plus",
    });
    return NextResponse.json({ ok: false, error: failure.error }, { status: failure.status });
  }
}
