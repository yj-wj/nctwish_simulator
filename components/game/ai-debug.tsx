"use client";

import { useEffect, useMemo, useState } from "react";
import { getEventTemplate } from "@/config/event-pool";
import { buildActionInterpretationInput, buildStoryGenerationInput } from "@/game/contextBuilder";
import { createInvalidMockOutput, getAIProvider } from "@/ai/mockProvider";
import { validateStoryOutput, type NarrativeValidationWarning } from "@/ai/outputValidator";
import { buildStoryPrompt } from "@/ai/prompts/storyPrompt";
import type { AIRequestMetadata } from "@/ai/provider";
import type { ActionInterpretationOutput, StoryGenerationOutput } from "@/ai/schemas";
import { AIClientError, generateStoryWithServer, getAIStatus, interpretActionWithServer, type PublicAIStatus } from "@/ai/client";
import { useGameStore } from "@/store/game-store";
import type { EntityId } from "@/types/memory";

export function AIDebug() {
  const gameState = useGameStore((state) => state.gameState);
  const eventHistory = useGameStore((state) => state.eventHistory);
  const memories = useGameStore((state) => state.memories);
  const storyFlags = useGameStore((state) => state.storyFlags);
  const selectedEventId = useGameStore((state) => state.selectedEventId);
  const [viewerId, setViewerId] = useState<EntityId>("player");
  const [output, setOutput] = useState<StoryGenerationOutput | null>(null);
  const [actionOutput, setActionOutput] = useState<ActionInterpretationOutput | null>(null);
  const [actionText, setActionText] = useState("这里人太多了，我先和他拉开一点距离，晚点再联系。");
  const [warnings, setWarnings] = useState<NarrativeValidationWarning[]>([]);
  const [validationError, setValidationError] = useState<string[]>([]);
  const [status, setStatus] = useState<PublicAIStatus | null>(null);
  const [statusError, setStatusError] = useState("");
  const [storyMetadata, setStoryMetadata] = useState<AIRequestMetadata | AIClientError["metadata"] | null>(null);
  const [actionMetadata, setActionMetadata] = useState<AIRequestMetadata | AIClientError["metadata"] | null>(null);
  const [busy, setBusy] = useState<"mock" | "story" | "action" | null>(null);
  const currentEvent = selectedEventId ? getEventTemplate(selectedEventId) : null;
  const input = useMemo(() => gameState ? buildStoryGenerationInput({
    gameState,
    currentEvent,
    eventHistory,
    memories,
    storyFlags,
    viewerId,
    playerAction: { type: "continue" },
  }) : null, [currentEvent, eventHistory, gameState, memories, storyFlags, viewerId]);
  const prompt = useMemo(() => input ? buildStoryPrompt(input) : null, [input]);
  const playerInput = useMemo(() => gameState ? buildStoryGenerationInput({
    gameState,
    currentEvent,
    eventHistory,
    memories,
    storyFlags,
    viewerId: "player",
    playerAction: { type: "continue" },
  }) : null, [currentEvent, eventHistory, gameState, memories, storyFlags]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    getAIStatus().then((next) => { setStatus(next); setStatusError(""); }).catch((error) => setStatusError(error instanceof Error ? error.message : "Unable to read AI status."));
  }, []);

  if (process.env.NODE_ENV !== "development" || !gameState || !input) return null;

  const generate = async () => {
    setBusy("mock");
    setValidationError([]);
    try {
      const generated = await getAIProvider().generateStory(input);
      const result = validateStoryOutput(generated.data, input);
      setStoryMetadata(generated.metadata);
      if (!result.success) {
        setOutput(null);
        setWarnings([]);
        setValidationError(result.issues);
      } else {
        setOutput(result.data);
        setWarnings(result.warnings);
      }
    } catch (error) {
      setOutput(null);
      setWarnings([]);
      setValidationError([error instanceof Error ? error.message : "Unknown mock provider error."]);
    } finally {
      setBusy(null);
    }
  };

  const interpretWithQwen = async () => {
    if (!playerInput) return;
    setBusy("action");
    setActionOutput(null);
    setValidationError([]);
    try {
      const result = await interpretActionWithServer(buildActionInterpretationInput(playerInput, actionText));
      setActionOutput(result.data);
      setActionMetadata(result.metadata);
    } catch (error) {
      setActionMetadata(error instanceof AIClientError ? error.metadata ?? null : null);
      setValidationError([error instanceof Error ? error.message : "Action interpretation failed."]);
    } finally {
      setBusy(null);
    }
  };

  const generateWithQwen = async () => {
    if (!playerInput) return;
    setBusy("story");
    setOutput(null);
    setValidationError([]);
    try {
      const generated = await generateStoryWithServer(playerInput);
      const result = validateStoryOutput(generated.data, playerInput);
      setStoryMetadata(generated.metadata);
      if (!result.success) throw new Error(`${result.message}: ${result.issues.join(" | ")}`);
      setOutput(result.data);
      setWarnings(result.warnings);
    } catch (error) {
      setStoryMetadata(error instanceof AIClientError ? error.metadata ?? null : null);
      setValidationError([error instanceof Error ? error.message : "Story generation failed."]);
    } finally {
      setBusy(null);
    }
  };

  const generateInvalid = () => {
    const result = validateStoryOutput(createInvalidMockOutput(), input);
    setOutput(result.success ? result.data : null);
    setWarnings(result.success ? result.warnings : []);
    setValidationError(result.success ? [] : result.issues);
  };

  const diagnostics = input.context.diagnostics;
  return <section className="engine-debug-block ai-debug-block" aria-label="AI Foundation Debug">
    <h3>AI Provider + Interpreter · Phase 5B</h3>
    <p className="debug-context-note">promptVersion = <b>{input.promptVersion}</b> · 当前只生成 suggestion，不结算 State、History、Flags 或 Memory。</p>

    <div className="ai-provider-status">
      <p><span>AI_MODE</span><b>{status?.mode ?? "loading"}</b></p>
      <p><span>provider</span><b>{status?.provider ?? "unavailable"}</b></p>
      <p><span>ACTION_MODEL</span><b>{status?.actionModel ?? "unavailable"}</b></p>
      <p><span>STORY_MODEL</span><b>{status?.storyModel ?? "unavailable"}</b></p>
      <p><span>CHAT_MODEL</span><b>{status?.chatModel ?? "unavailable"}</b></p>
      <p><span>SNS_MODEL</span><b>{status?.snsModel ?? "unavailable"}</b></p>
      <p><span>configured</span><b>{status ? (status.configured ? "yes" : "no") : "unavailable"}</b></p>
      <p><span>thinking</span><b>{status ? String(status.enableThinking) : "unavailable"}</b></p>
    </div>
    {statusError && <div className="ai-validation-error"><strong>AI Configuration Error</strong><span>{statusError}</span></div>}
    {status && !status.configured && <p className="debug-effect-line"><strong>Missing server configuration</strong> {status.missing.join(", ")}</p>}

    <div className="memory-retrieval-controls">
      <label>Context Viewer<select aria-label="AI Context Viewer" value={viewerId} onChange={(event) => setViewerId(event.target.value as EntityId)}>
        <option value="player">Player · 主剧情视角</option>
        <option value="npc:manager">Manager · 内部测试视角</option>
      </select></label>
    </div>

    <div className="ai-context-counts">
      <p><span>Recent Events</span><b>{diagnostics.includedRecentEvents}</b><small>Excluded older: {diagnostics.excludedOlderEvents}</small></p>
      <p><span>Included Memories</span><b>{diagnostics.includedMemories}</b><small>Limit: {diagnostics.relevantMemoryLimit}</small></p>
      <p><span>Excluded by visibility</span><b>{diagnostics.excludedMemoriesByVisibility}</b></p>
      <p><span>Excluded by limit</span><b>{diagnostics.excludedMemoriesByLimit}</b></p>
    </div>

    <details className="debug-details">
      <summary>AI Context Preview</summary>
      <pre className="ai-json-preview">{JSON.stringify(input.context, null, 2)}</pre>
    </details>
    <details className="debug-details">
      <summary>Prompt Sections · {prompt?.sections.length ?? 0}</summary>
      <div className="debug-event-list">{prompt?.sections.map((section) => <p key={section.id}><b>{section.id}</b><small>{section.content}</small></p>)}</div>
    </details>

    <div className="fixture-controls">
      <button className="button primary debug-generate" type="button" disabled={busy !== null} onClick={generate}>{busy === "mock" ? "Generating…" : "Generate Mock AI Story"}</button>
      <button className="button secondary debug-generate" type="button" onClick={generateInvalid}>Generate Invalid Mock Output</button>
    </div>

    <div className="ai-real-controls">
      <label>Player Free Action<textarea aria-label="Player Free Action" rows={3} maxLength={500} value={actionText} onChange={(event) => setActionText(event.target.value)} /></label>
      <div className="fixture-controls">
        <button className="button primary debug-generate" type="button" disabled={busy !== null || status?.mode !== "qwen" || !status.configured || !actionText.trim()} onClick={interpretWithQwen}>{busy === "action" ? "Interpreting…" : "Interpret with Qwen"}</button>
        <button className="button primary debug-generate" type="button" disabled={busy !== null || status?.mode !== "qwen" || !status.configured} onClick={generateWithQwen}>{busy === "story" ? "Generating…" : "Generate Qwen Story"}</button>
      </div>
    </div>

    {actionOutput && <div className="ai-output-preview" aria-label="Action Interpretation Output">
      <small>VALIDATED ACTION INTERPRETATION</small>
      <p><strong>intentSummary</strong> {actionOutput.intentSummary}</p>
      <p><strong>actionType</strong> {actionOutput.actionType}</p>
      <p><strong>semanticTags</strong> {actionOutput.semanticTags.join(", ") || "none"}</p>
      <p><strong>romanticIntensity</strong> {actionOutput.romanticIntensity}</p>
      <p><strong>publicExposure</strong> {actionOutput.publicExposure}</p>
      <p><strong>boundaryRisk</strong> {actionOutput.boundaryRisk}</p>
      <p><strong>confidence</strong> {actionOutput.confidence}</p>
    </div>}
    {actionMetadata && <UsageLine label="Action usage" metadata={actionMetadata} />}

    {validationError.length > 0 && <div className="ai-validation-error" role="alert"><strong>AI Output Validation Failed</strong>{validationError.map((issue) => <span key={issue}>{issue}</span>)}</div>}
    {warnings.length > 0 && <p className="debug-effect-line"><strong>Validation warnings</strong> {warnings.join(", ")}</p>}
    {output && <div className="ai-output-preview" aria-label="Mock AI Story Output">
      <small>VALIDATED SUGGESTION</small>
      <h4>{output.title}</h4>
      <p>{output.story}</p>
      <div className="debug-event-list">{output.choices.map((choice) => <p key={choice.id}><b>{choice.id}</b><span>{choice.text}</span></p>)}</div>
      <p><strong>Suggested Effects</strong> {output.suggestedEffects.map(({ stat, magnitude }) => `${stat}:${magnitude}`).join(" · ") || "none"}</p>
      <p><strong>Choice / Outcome Tags</strong> {[...output.suggestedChoiceTags, ...output.suggestedOutcomeTags].join(" · ") || "none"}</p>
      <div className="debug-event-list">{output.memoryCandidates.map((memory, index) => <p key={`${memory.type}-${index}`}><b>{memory.type} · importance {memory.importance}</b><small>{memory.summary}</small><small>actors: {memory.actors.join(", ")} · tags: {memory.tags.join(", ")}</small></p>)}</div>
    </div>}
    {storyMetadata && <UsageLine label="Story usage" metadata={storyMetadata} />}
  </section>;
}

function UsageLine({ label, metadata }: { label: string; metadata: NonNullable<AIRequestMetadata | AIClientError["metadata"]> }) {
  const value = (tokens: number | null) => tokens ?? "unavailable";
  return <p className="debug-effect-line"><strong>{label}</strong> provider {metadata.provider} · model {metadata.model} · latency {metadata.latencyMs}ms · input {value(metadata.usage.inputTokens)} · output {value(metadata.usage.outputTokens)} · total {value(metadata.usage.totalTokens)} · {metadata.success ? "success" : "failure"}</p>;
}
