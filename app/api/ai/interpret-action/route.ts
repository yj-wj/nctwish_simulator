import "server-only";
import { NextResponse } from "next/server";
import { actionInterpretationInputSchema } from "@/ai/schemas";
import { createServerAIProvider } from "@/ai/server/providerFactory";
import { toAIErrorPayload } from "@/ai/server/apiError";

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: { code: "invalid_request", message: "Request body must be valid JSON." } }, { status: 400 });
  }
  const parsed = actionInterpretationInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: { code: "invalid_request", message: "Action input failed validation.", issues: parsed.error.issues } }, { status: 400 });
  }
  try {
    const result = await createServerAIProvider().interpretAction(parsed.data);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const failure = toAIErrorPayload(error, {
      provider: process.env.AI_MODE === "qwen" ? "qwen" : "mock",
      model: process.env.ACTION_MODEL?.trim() || "qwen3.7-flash",
    });
    return NextResponse.json({ ok: false, error: failure.error }, { status: failure.status });
  }
}
