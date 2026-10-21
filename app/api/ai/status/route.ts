import "server-only";
import { NextResponse } from "next/server";
import { readServerAIConfig } from "@/ai/server/serverConfig";

export async function GET() {
  try {
    return NextResponse.json({ ok: true, status: readServerAIConfig().publicStatus });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { code: "configuration_error", message: error instanceof Error ? error.message : "Invalid AI configuration." } }, { status: 500 });
  }
}
