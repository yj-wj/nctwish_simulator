"use client";

import {
  endingDerivedConditionLabels,
  endingHistoryMetricLabels,
  endingStoryFlagLabels,
} from "@/config/endings";
import { evaluateEndingCandidates } from "@/game/endingEngine";
import { useGameStore } from "@/store/game-store";
import type {
  EndingDerivedConditionId,
  EndingHistoryMetricId,
  EndingStoryFlagId,
} from "@/types/ending";

const derivedConditionDescriptions: Record<EndingDerivedConditionId, string> = {
  playerLifeStable: "money ≥ 500 · mood ≥ 40 · 最近 8 周成长事件 ≥ 2 · 无未解决 financial_crisis",
  stillInLove: "affection ≥ 81 · 已确认关系 · 未正式分手",
  maleLeadCareerStable: "careerPressure ≤ 60 · 最近 4 周无未解决 career_breakdown",
};

export function EndingEngineDebug() {
  const gameState = useGameStore((state) => state.gameState);
  const endingContext = useGameStore((state) => state.endingContext);
  const setHistoryMetric = useGameStore((state) => state.setEndingHistoryMetric);
  const setStoryFlag = useGameStore((state) => state.setEndingStoryFlag);
  if (!gameState) return null;
  const evaluation = evaluateEndingCandidates(gameState, endingContext);

  return <section className="engine-debug-block" aria-label="Ending Engine Debug">
    <h3>Ending Engine</h3>
    <p className="debug-effect-line"><strong>Ending Branch</strong> {evaluation.progressEligible ? `available · ${evaluation.progressReason}` : "unavailable"}</p>
    <p className="debug-effect-line"><strong>Ending Candidates</strong> {evaluation.candidates.map(({ id }) => id).join(", ") || "none"}</p>

    <div className="ending-derived" aria-label="Derived Conditions">
      <strong>Derived Conditions · automatic</strong>
      {Object.entries(evaluation.derivedConditions).map(([condition, matched]) => {
        const id = condition as EndingDerivedConditionId;
        return <p key={id}><span>{endingDerivedConditionLabels[id]}</span><b>{matched ? "true" : "false"}</b><small>{derivedConditionDescriptions[id]}</small></p>;
      })}
    </div>

    <details className="debug-details">
      <summary>Temporary — Phase 4 will automate</summary>
      <p className="debug-context-note">这些 History Metrics 与 Story Flags 当前只用于开发测试，尚未由 Weekly History、Choice History 或正式事件自动产生。</p>
      <h4>History Metrics</h4>
      <div className="ending-metrics">
        {Object.entries(endingHistoryMetricLabels).map(([metric, label]) => {
          const id = metric as EndingHistoryMetricId;
          return <label key={id}><span>{label}</span><input type="number" min="0" value={endingContext.historyMetrics[id]} onChange={(event) => setHistoryMetric(id, event.currentTarget.valueAsNumber)} /></label>;
        })}
      </div>
      <h4>Story Flags</h4>
      <div className="ending-flags">
        {Object.entries(endingStoryFlagLabels).map(([flag, label]) => {
          const id = flag as EndingStoryFlagId;
          return <label key={id}><input type="checkbox" checked={endingContext.storyFlags[id]} onChange={(event) => setStoryFlag(id, event.target.checked)} />{label}</label>;
        })}
      </div>
    </details>
  </section>;
}
