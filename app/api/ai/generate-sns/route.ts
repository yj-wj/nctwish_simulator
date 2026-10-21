import "server-only";
import { NextResponse } from "next/server";
import { snsGenerationInputSchema } from "@/ai/snsSchemas";
import { createServerAIProvider } from "@/ai/server/providerFactory";
import { toAIErrorPayload } from "@/ai/server/apiError";

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: { code: "invalid_request", message: "Request body must be valid JSON." } }, { status: 400 });
  }
  const parsed = snsGenerationInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: { code: "invalid_request", message: "SNS input failed validation.", issues: parsed.error.issues } }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, result: await createServerAIProvider().generateSNS(parsed.data) });
  } catch (error) {
    const failure = toAIErrorPayload(error, { provider: process.env.AI_MODE === "qwen" ? "qwen" : "mock", model: process.env.SNS_MODEL?.trim() || process.env.STORY_MODEL?.trim() || "qwen3.7-plus" });
    return NextResponse.json({ ok: false, error: failure.error }, { status: failure.status });
  }
}
