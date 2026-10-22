"use client";

import { useGameStore } from "@/store/game-store";
import { DEBUG_MODE_ENABLED } from "@/config/debug";

function token(value: number | null): string | number {
  return value ?? "unavailable";
}

export function TurnTraceDebug() {
  const status = useGameStore((state) => state.turnStatus);
  const trace = useGameStore((state) => state.lastTurnTrace);
  const badcases = useGameStore((state) => state.aiBadcases);
  if (!DEBUG_MODE_ENABLED) return null;

  return <section className="engine-debug-block turn-trace-debug" aria-label="Turn Trace Debug">
    <h3>Turn Trace · Phase 5C</h3>
    <p className="debug-context-note">status = <b>{status}</b> · AI 负责建议，系统验证后才原子结算。</p>
    {!trace ? <p className="debug-empty">完成一次正式 A/B/C 或自由行动后显示完整 Trace。</p> : <>
      <div className="event-debug-summary">
        <span>Turn <b>{trace.turnId}</b></span>
        <span>Input <b>{trace.inputKind}</b></span>
        <span>Risk <b>{trace.ruleEvaluation.riskLevel}</b></span>
        <span>Endings <b>{trace.endingCandidates.map(({ id }) => id).join(", ") || "none"}</b></span>
      </div>
      <details className="debug-details" open><summary>Player Input → Action → Rule</summary><div className="debug-event-list">
        <p><b>Player Input</b><small>{trace.playerInput}</small></p>
        <p><b>Action Interpretation</b><small>{trace.actionInterpretation ? JSON.stringify(trace.actionInterpretation) : "preset choice · no interpreter call"}</small></p>
        <p><b>Rule Evaluation</b><small>allowed {String(trace.ruleEvaluation.allowed)} · risk {trace.ruleEvaluation.riskLevel} · violations {trace.ruleEvaluation.violatedRules.join(", ") || "none"}</small></p>
      </div></details>
      <details className="debug-details"><summary>Context → AI Story Output</summary>
        <pre className="ai-json-preview">{JSON.stringify({ context: trace.storyContext.context, output: trace.storyOutput }, null, 2)}</pre>
      </details>
      <details className="debug-details" open><summary>Settlement Proposal</summary><div className="debug-event-list">
        <p><b>AI Suggested</b><small>{trace.settlementProposal.suggestedEffects.map(({ stat, magnitude, source }) => `${source}:${stat}:${magnitude}`).join(" · ") || "none"}</small></p>
        <p><b>Accepted Effects</b><small>{Object.entries(trace.settlementProposal.acceptedEffects).map(([stat, magnitude]) => `${stat}:${magnitude}`).join(" · ") || "none"}</small></p>
        <p><b>Rejected Effects</b><small>{trace.settlementProposal.rejectedEffects.map(({ stat, magnitude, rejectionReason }) => `${stat}:${magnitude} (${rejectionReason})`).join(" · ") || "none"}</small></p>
        <p><b>Flag Effects</b><small>{trace.settlementProposal.flagEffects.map(({ flag, value }) => `${flag}=${value}`).join(" · ") || "none"}</small></p>
        <p><b>Memory Effects</b><small>{trace.settlementProposal.memoryEffects.map(({ key, visibility }) => `${key}:${visibility}`).join(" · ") || "none"}</small></p>
      </div></details>
      <details className="debug-details"><summary>Before → After State</summary>
        <pre className="ai-json-preview">{JSON.stringify({ before: trace.beforeState.stats, after: trace.afterState.stats, relationshipStageBefore: trace.relationshipStageBefore, relationshipStageAfter: trace.relationshipStageAfter }, null, 2)}</pre>
      </details>
      <div className="ai-provider-status">
        <p><span>Action model</span><b>{trace.actionMetadata?.model ?? "not called"}</b><small>input {token(trace.actionMetadata?.usage.inputTokens ?? null)} · output {token(trace.actionMetadata?.usage.outputTokens ?? null)} · {trace.actionMetadata?.latencyMs ?? 0}ms</small></p>
        <p><span>Story model</span><b>{trace.storyMetadata.model}</b><small>input {token(trace.storyMetadata.usage.inputTokens)} · output {token(trace.storyMetadata.usage.outputTokens)} · {trace.storyMetadata.latencyMs}ms</small></p>
        <p><span>Total turn</span><b>{token(trace.totalTokens)} tokens</b><small>{trace.totalLatencyMs}ms</small></p>
      </div>
    </>}
    <details className="debug-details"><summary>AI Badcases · {badcases.length}</summary><div className="debug-event-list">
      {badcases.length ? badcases.map((badcase) => <p key={`${badcase.turnId}-${badcase.occurredAt}`}><b>{badcase.errorType} · {badcase.model}</b><span>{badcase.playerAction}</span><small>{badcase.relationshipStage} · {badcase.validationErrors.join(" | ")}</small></p>) : <p><span>尚无 Badcase</span></p>}
    </div></details>
  </section>;
}

