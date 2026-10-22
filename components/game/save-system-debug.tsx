"use client";

import { useGameStore } from "@/store/game-store";
import { DEBUG_MODE_ENABLED } from "@/config/debug";
import { GAME_SAVE_SCHEMA_VERSION } from "@/types/save";

function formatTimestamp(value: string | null): string {
  return value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "none";
}

export function SaveSystemDebug() {
  const state = useGameStore();
  if (!DEBUG_MODE_ENABLED || !state.gameState) return null;

  return <section className="engine-debug-block save-debug-block" aria-label="Save System Debug">
    <h3>Save System</h3>
    <div className="save-debug-summary">
      <p><span>active saveId</span><b>{state.activeSaveId ?? "none"}</b></p>
      <p><span>schemaVersion</span><b>{GAME_SAVE_SCHEMA_VERSION}</b></p>
      <p><span>createdAt</span><b>{formatTimestamp(state.activeSaveCreatedAt)}</b></p>
      <p><span>updatedAt</span><b>{formatTimestamp(state.activeSaveUpdatedAt)}</b></p>
      <p><span>save count</span><b>{state.saveSummaries.length}</b></p>
    </div>

    {state.saveError ? <p className="save-error" role="alert">{state.saveError}</p> : null}

    <div className="fixture-controls">
      <button className="button primary debug-generate" type="button" onClick={() => state.saveNow()}>Save Now</button>
      <button className="button secondary debug-generate" type="button" disabled={!state.activeSaveId} onClick={() => state.activeSaveId && state.loadSave(state.activeSaveId)}>Reload Active Save</button>
      <button className="button secondary debug-generate" type="button" onClick={() => state.createTestSave()}>Create Test Save</button>
      <button className="button secondary debug-generate" type="button" disabled={!state.activeSaveId} onClick={() => state.activeSaveId && state.deleteSave(state.activeSaveId)}>Delete Active Save</button>
    </div>

    <div className="ending-derived" aria-label="Save Data Summary">
      <strong>Save Data Summary</strong>
      <p><span>GameState</span><b>yes</b></p>
      <p><span>Event History</span><b>{state.eventHistory.length}</b></p>
      <p><span>Choice History</span><b>{state.choiceHistory.length}</b></p>
      <p><span>Weekly History</span><b>{state.weeklyHistory.length}</b></p>
      <p><span>Story Flags true</span><b>{Object.values(state.storyFlags).filter(Boolean).length}</b></p>
      <p><span>Memories</span><b>{state.memories.length}</b></p>
      <p><span>Processed Settlements</span><b>{state.processedSettlementIds.length}</b></p>
    </div>

    <details className="debug-details">
      <summary>Save List · {state.saveSummaries.length}</summary>
      <div className="debug-event-list save-list">{state.saveSummaries.map((save) => <p key={save.saveId}>
        <span>{save.playerName} · {save.maleLead} · 第 {save.week} 周</span>
        <small>{save.saveId}</small>
        <small>updated {formatTimestamp(save.updatedAt)}</small>
        <span className="save-row-actions">
          <button type="button" onClick={() => state.loadSave(save.saveId)}>Load</button>
          <button type="button" onClick={() => state.deleteSave(save.saveId)}>Delete</button>
        </span>
      </p>)}</div>
    </details>
  </section>;
}
