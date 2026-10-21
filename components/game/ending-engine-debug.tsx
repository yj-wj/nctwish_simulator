"use client";

import { useState } from "react";
import { endingDerivedConditionLabels } from "@/config/endings";
import { historyTestFixtures } from "@/config/history-fixtures";
import { historyMetricLabels, storyFlagLabels } from "@/config/history";
import { buildEndingContext } from "@/game/endingContextBuilder";
import { evaluateEndingCandidates } from "@/game/endingEngine";
import { useGameStore } from "@/store/game-store";
import type { EndingDerivedConditionId } from "@/types/ending";

const derivedConditionDescriptions: Record<EndingDerivedConditionId, string> = {
  playerLifeStable: "money ≥ 500 · mood ≥ 40 · 最近 8 周成长事件 ≥ 2 · 无 active financial_crisis",
  stillInLove: "affection ≥ 81 · 已确认关系 · 未正式分手",
  maleLeadCareerStable: "careerPressure ≤ 60 · 最近 4 周无 active career_breakdown",
};

export function EndingEngineDebug() {
  const [fixtureId, setFixtureId] = useState(historyTestFixtures[0].id);
  const gameState = useGameStore((state) => state.gameState);
  const weeklyHistory = useGameStore((state) => state.weeklyHistory);
  const choiceHistory = useGameStore((state) => state.choiceHistory);
  const eventHistory = useGameStore((state) => state.eventHistory);
  const storyFlags = useGameStore((state) => state.storyFlags);
  const applyFixture = useGameStore((state) => state.applyHistoryTestFixture);
  if (!gameState) return null;
  const context = buildEndingContext(gameState, weeklyHistory, choiceHistory, eventHistory, storyFlags);
  const evaluation = evaluateEndingCandidates(gameState, context);

  return <section className="engine-debug-block" aria-label="History and Ending Engine Debug">
    <h3>History Automation + Ending Engine</h3>
    <p className="debug-effect-line"><strong>Ending Branch</strong> {evaluation.progressEligible ? `available · ${evaluation.progressReason}` : "unavailable"}</p>
    <p className="debug-effect-line"><strong>Ending Candidates</strong> {evaluation.candidates.map(({ id }) => id).join(", ") || "none"}</p>

    <div className="ending-derived" aria-label="Derived Conditions">
      <strong>Derived Conditions · automatic</strong>
      {Object.entries(evaluation.derivedConditions).map(([condition, matched]) => {
        const id = condition as EndingDerivedConditionId;
        return <p key={id}><span>{endingDerivedConditionLabels[id]}</span><b>{matched ? "true" : "false"}</b><small>{derivedConditionDescriptions[id]}</small></p>;
      })}
    </div>

    <div className="ending-derived" aria-label="History Metrics">
      <strong>History Metrics · automatic</strong>
      {Object.entries(context.historyMetrics).map(([metric, value]) => <p key={metric}><span>{historyMetricLabels[metric as keyof typeof historyMetricLabels]}</span><b>{value}</b></p>)}
    </div>

    <details className="debug-details">
      <summary>Weekly State History · {weeklyHistory.length}</summary>
      <div className="debug-event-list">{weeklyHistory.length ? weeklyHistory.map((snapshot) => <p key={snapshot.id}><span>第 {snapshot.week} 周 · mood {snapshot.mood} · affection {snapshot.affection}</span><small>secrecy {snapshot.secrecy} · companyAlert {snapshot.companyAlert} · careerPressure {snapshot.careerPressure}</small></p>) : <p><span>尚无正式周结算快照</span></p>}</div>
    </details>

    <details className="debug-details">
      <summary>Choice History · {choiceHistory.length}</summary>
      <div className="debug-event-list">{choiceHistory.length ? choiceHistory.map((choice) => <p key={choice.id}><span>第 {choice.week} 周 · {choice.eventId} · {choice.choiceId}</span><small>{choice.choiceTags.join(", ") || "no tags"}</small></p>) : <p><span>尚无正式选择记录</span></p>}</div>
    </details>

    <details className="debug-details">
      <summary>Story Flags · read only</summary>
      <div className="ending-flags readonly-flags">{Object.entries(storyFlags).map(([flag, value]) => <p key={flag}><span>{storyFlagLabels[flag as keyof typeof storyFlagLabels]}</span><b>{String(value)}</b></p>)}</div>
    </details>

    <details className="debug-details">
      <summary>Development Test Fixtures</summary>
      <p className="debug-context-note">Fixture 通过正式 structured outcome → history → flag updater 管线结算；相同 fixture settlement 重复点击不会重复计数。</p>
      <div className="fixture-controls">
        <select aria-label="History Test Fixture" value={fixtureId} onChange={(event) => setFixtureId(event.target.value)}>{historyTestFixtures.map((fixture) => <option key={fixture.id} value={fixture.id}>{fixture.label}</option>)}</select>
        <button className="button primary debug-generate" type="button" onClick={() => applyFixture(fixtureId)}>Apply Test Outcome</button>
      </div>
    </details>
  </section>;
}
