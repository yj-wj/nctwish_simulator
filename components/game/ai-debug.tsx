"use client";

import { useMemo, useState } from "react";
import { AI_MODE } from "@/config/ai";
import { getEventTemplate } from "@/config/event-pool";
import { buildStoryGenerationInput } from "@/game/contextBuilder";
import { createInvalidMockOutput, getAIProvider } from "@/ai/mockProvider";
import { validateStoryOutput, type NarrativeValidationWarning } from "@/ai/outputValidator";
import { buildStoryPrompt } from "@/ai/prompts/storyPrompt";
import type { StoryGenerationOutput } from "@/ai/schemas";
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
  const [warnings, setWarnings] = useState<NarrativeValidationWarning[]>([]);
  const [validationError, setValidationError] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
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

  if (process.env.NODE_ENV !== "development" || !gameState || !input) return null;

  const generate = async () => {
    setBusy(true);
    setValidationError([]);
    try {
      const raw = await getAIProvider().generateStory(input);
      const result = validateStoryOutput(raw, input);
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
      setBusy(false);
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
    <h3>AI Foundation · Phase 5A</h3>
    <p className="debug-context-note">AI_MODE = <b>{AI_MODE}</b> · promptVersion = <b>{input.promptVersion}</b> · 当前只生成 suggestion，不结算 State、History、Flags 或 Memory。</p>

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
      <button className="button primary debug-generate" type="button" disabled={busy} onClick={generate}>{busy ? "Generating…" : "Generate Mock AI Story"}</button>
      <button className="button secondary debug-generate" type="button" onClick={generateInvalid}>Generate Invalid Mock Output</button>
    </div>

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
  </section>;
}
