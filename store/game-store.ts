"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { eventPool } from "@/config/event-pool";
import { getHistoryTestFixture } from "@/config/history-fixtures";
import { initialStoryFlags } from "@/config/history";
import { mockChoiceEffects } from "@/config/mock-choice-effects";
import { createInitialGameState } from "@/game/create-initial-game-state";
import { createEventHistoryEntry, runEventEngine } from "@/game/eventEngine";
import { evaluateAction } from "@/game/ruleEngine";
import { processStructuredSettlement } from "@/game/settlementPipeline";
import { setGameStateForDebug, settleChoice } from "@/game/stateEngine";
import { mockStories } from "@/mocks/story";
import type { CharacterBoundaryId, CharacterId } from "@/types/character";
import type { EventEngineResult, EventHistoryEntry } from "@/types/event";
import type { GameModeId, GameState, PlayerDraft, StatId } from "@/types/game";
import type { ChoiceHistoryRecord, StoryFlagState, WeeklyStateSnapshot } from "@/types/history";
import type { MemoryRecord } from "@/types/memory";
import type { StateChangeLogEntry } from "@/types/state";
import type { ActionReceipt, StoryChoice } from "@/types/ui";

const initialDraft: PlayerDraft = {
  name: "",
  age: "",
  identityId: "student",
  customIdentity: "",
  maleLeadId: "sion",
  fanLevelId: "passerby",
  gameModeId: "slow",
};

const initialStoryUI = { storyIndex: 0, previousChoice: null, receipt: null, freeAction: "" };
function normalizeEventHistory(value: unknown): EventHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry, index) => {
    const legacy = entry as Partial<EventHistoryEntry>;
    return {
      recordId: legacy.recordId ?? `legacy:${legacy.week ?? 0}:${legacy.eventId ?? "unknown"}:${index}`,
      eventId: legacy.eventId ?? "unknown",
      week: legacy.week ?? 0,
      category: legacy.category ?? "daily",
      eventTags: legacy.eventTags ?? [],
      outcomeTags: legacy.outcomeTags ?? [],
      status: legacy.status ?? "selected",
      settlementId: legacy.settlementId,
      flagEffects: legacy.flagEffects ?? [],
    };
  });
}

const initialEventUI = {
  eventHistory: [] as EventHistoryEntry[],
  selectedEventId: null as string | null,
  eventEngineResult: null as EventEngineResult | null,
  eventSeed: 1,
  selectedEventRecordId: null as string | null,
  stateChangeLog: [] as StateChangeLogEntry[],
  weeklyHistory: [] as WeeklyStateSnapshot[],
  choiceHistory: [] as ChoiceHistoryRecord[],
  storyFlags: { ...initialStoryFlags } as StoryFlagState,
  processedSettlementIds: [] as string[],
  memories: [] as MemoryRecord[],
};

interface GameStore {
  draft: PlayerDraft;
  gameState: GameState | null;
  playerConfirmed: boolean;
  characterConfirmed: boolean;
  entered: boolean;
  hasHydrated: boolean;
  receipt: ActionReceipt | null;
  freeAction: string;
  storyIndex: number;
  previousChoice: StoryChoice | null;
  eventHistory: EventHistoryEntry[];
  selectedEventId: string | null;
  eventEngineResult: EventEngineResult | null;
  eventSeed: number;
  selectedEventRecordId: string | null;
  stateChangeLog: StateChangeLogEntry[];
  weeklyHistory: WeeklyStateSnapshot[];
  choiceHistory: ChoiceHistoryRecord[];
  storyFlags: StoryFlagState;
  processedSettlementIds: string[];
  memories: MemoryRecord[];
  patchDraft: (draft: Partial<PlayerDraft>) => void;
  confirmPlayer: (draft: PlayerDraft) => void;
  selectCharacter: (id: CharacterId) => void;
  confirmCharacter: () => void;
  enterGame: () => void;
  recordAction: (receipt: ActionReceipt) => void;
  advanceMockStory: (id: StoryChoice["id"]) => void;
  setFreeAction: (text: string) => void;
  setAffection: (affection: number) => void;
  setDebugStat: (stat: StatId, value: number) => void;
  setDebugGameMode: (gameMode: GameModeId) => void;
  setDebugWeek: (week: number) => void;
  applyMockChoice: (eventId: string, choiceId: StoryChoice["id"], boundaryId?: CharacterBoundaryId) => void;
  applyHistoryTestFixture: (fixtureId: string) => void;
  generateNextMockEvent: () => void;
  setHydrated: (hydrated: boolean) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      draft: { ...initialDraft },
      gameState: null,
      playerConfirmed: false,
      characterConfirmed: false,
      entered: false,
      hasHydrated: false,
      ...initialStoryUI,
      ...initialEventUI,
      patchDraft: (patch) =>
        set((state) => ({
          draft: { ...state.draft, ...patch },
          gameState: null,
          playerConfirmed: false,
          characterConfirmed: false,
          entered: false,
          ...initialStoryUI,
          ...initialEventUI,
        })),
      confirmPlayer: (draft) =>
        set({
          draft,
          gameState: createInitialGameState(draft),
          playerConfirmed: true,
          characterConfirmed: false,
          entered: false,
          ...initialStoryUI,
          ...initialEventUI,
        }),
      selectCharacter: (id) =>
        set((state) => ({
          draft: { ...state.draft, maleLeadId: id },
          gameState: state.gameState ? { ...state.gameState, maleLead: id } : null,
          characterConfirmed: false,
          entered: false,
          ...initialStoryUI,
          ...initialEventUI,
        })),
      confirmCharacter: () => {
        const { draft, gameState } = get();
        set({ gameState: gameState ?? createInitialGameState(draft), characterConfirmed: true });
      },
      enterGame: () => {
        const { draft, gameState } = get();
        set({ gameState: gameState ?? createInitialGameState(draft), entered: true });
      },
      recordAction: (receipt) => set({ receipt }),
      advanceMockStory: (id) =>
        set((state) => {
          const choice = mockStories[state.storyIndex].choices.find((option) => option.id === id);
          if (!choice || !state.gameState) return state;
          const eventId = state.selectedEventId ?? mockStories[state.storyIndex].id;
          const eventTemplate = eventPool.find((event) => event.id === eventId);
          const eventRecordId = state.selectedEventRecordId
            ?? `${state.gameState.gameId}:${state.gameState.week}:${eventId}:story`;
          const settlementId = `${eventRecordId}:choice:${choice.id}`;
          if (state.processedSettlementIds.includes(settlementId)) return state;
          const transition = settleChoice(state.gameState, choice.effects, {
            eventId,
            choiceId: choice.id,
          });
          const history = processStructuredSettlement({
            weeklyHistory: state.weeklyHistory,
            choiceHistory: state.choiceHistory,
            eventHistory: state.eventHistory,
            storyFlags: state.storyFlags,
            processedSettlementIds: state.processedSettlementIds,
            memories: state.memories,
          }, transition.gameState, {
            settlementId,
            week: state.gameState.week,
            event: {
              recordId: eventRecordId,
              eventId,
              category: eventTemplate?.category ?? "daily",
              eventTags: eventTemplate?.tags ?? ["daily-life"],
            },
            choice: {
              choiceId: choice.id,
              choiceText: choice.text,
              choiceTags: choice.tags,
              isImportantRelationshipEvent: eventTemplate?.category === "relationship",
            },
            beforeState: transition.changeLog.before,
            afterState: transition.changeLog.after,
            relationshipStageBefore: transition.changeLog.relationshipStageBefore,
            relationshipStageAfter: transition.changeLog.relationshipStageAfter,
            outcome: choice.outcome ?? { outcomeTags: [], flagEffects: [], eventStatus: "resolved" },
          });
          const eventEngineResult = runEventEngine(transition.gameState, {
            history: history.eventHistory,
            seed: state.eventSeed,
          });
          const selectedEvent = eventEngineResult.selectedEvent?.event;
          const nextEventRecord = selectedEvent
            ? createEventHistoryEntry(selectedEvent, transition.gameState, history.eventHistory.length)
            : null;
          return {
            gameState: transition.gameState,
            storyIndex: (state.storyIndex + 1) % mockStories.length,
            previousChoice: choice,
            receipt: { label: choice.text, response: `已选择 ${choice.id}：State Engine 已结算结构化 Mock Effect。` },
            freeAction: "",
            eventEngineResult,
            selectedEventId: selectedEvent?.id ?? null,
            selectedEventRecordId: nextEventRecord?.recordId ?? null,
            eventHistory: nextEventRecord ? [...history.eventHistory, nextEventRecord] : history.eventHistory,
            eventSeed: state.eventSeed + 1,
            stateChangeLog: [...state.stateChangeLog, transition.changeLog],
            weeklyHistory: history.weeklyHistory,
            choiceHistory: history.choiceHistory,
            storyFlags: history.storyFlags,
            processedSettlementIds: history.processedSettlementIds,
            memories: history.memories,
          };
        }),
      setFreeAction: (freeAction) => set({ freeAction }),
      setAffection: (affection) =>
        set((state) => ({
          gameState: state.gameState
            ? setGameStateForDebug(state.gameState, { stats: { affection } })
            : null,
          eventEngineResult: null,
        })),
      setDebugStat: (stat, value) =>
        set((state) => {
          if (!state.gameState || !Number.isFinite(value)) return state;
          return {
            gameState: setGameStateForDebug(state.gameState, { stats: { [stat]: value } }),
            eventEngineResult: null,
          };
        }),
      setDebugGameMode: (gameMode) =>
        set((state) => ({
          gameState: state.gameState ? { ...state.gameState, gameMode } : null,
          eventEngineResult: null,
        })),
      setDebugWeek: (week) =>
        set((state) => ({
          gameState: state.gameState ? setGameStateForDebug(state.gameState, { week }) : null,
          eventEngineResult: null,
        })),
      applyMockChoice: (eventId, choiceId, boundaryId) =>
        set((state) => {
          if (!state.gameState) return state;
          const eventTemplate = eventPool.find((event) => event.id === eventId);
          const debugChoice = mockStories[0].choices.find((choice) => choice.id === choiceId)!;
          const eventRecordId = state.selectedEventId === eventId && state.selectedEventRecordId
            ? state.selectedEventRecordId
            : `debug:event:${state.gameState.gameId}:${state.gameState.week}:${eventId}`;
          const settlementId = `${eventRecordId}:choice:${choiceId}`;
          if (state.processedSettlementIds.includes(settlementId)) return state;
          const ruleEvaluation = boundaryId
            ? evaluateAction(state.gameState, {
                type: "other",
                romanticIntensity: "none",
                physicalIntimacy: "none",
                publicExposure: "none",
                professionalBoundary: "respected",
                characterBoundarySignals: [boundaryId],
              })
            : undefined;
          const transition = settleChoice(state.gameState, mockChoiceEffects[choiceId], {
            eventId,
            choiceId,
            ruleEvaluation,
          });
          const history = processStructuredSettlement({
            weeklyHistory: state.weeklyHistory,
            choiceHistory: state.choiceHistory,
            eventHistory: state.eventHistory,
            storyFlags: state.storyFlags,
            processedSettlementIds: state.processedSettlementIds,
            memories: state.memories,
          }, transition.gameState, {
            settlementId,
            week: state.gameState.week,
            event: {
              recordId: eventRecordId,
              eventId,
              category: eventTemplate?.category ?? "daily",
              eventTags: eventTemplate?.tags ?? ["daily-life"],
            },
            choice: {
              choiceId,
              choiceText: debugChoice.text,
              choiceTags: debugChoice.tags,
              isImportantRelationshipEvent: eventTemplate?.category === "relationship",
            },
            beforeState: transition.changeLog.before,
            afterState: transition.changeLog.after,
            relationshipStageBefore: transition.changeLog.relationshipStageBefore,
            relationshipStageAfter: transition.changeLog.relationshipStageAfter,
            outcome: { outcomeTags: [], flagEffects: [], eventStatus: "resolved" },
          });
          return {
            gameState: transition.gameState,
            eventEngineResult: null,
            stateChangeLog: [...state.stateChangeLog, transition.changeLog],
            weeklyHistory: history.weeklyHistory,
            choiceHistory: history.choiceHistory,
            eventHistory: history.eventHistory,
            storyFlags: history.storyFlags,
            processedSettlementIds: history.processedSettlementIds,
            memories: history.memories,
          };
        }),
      applyHistoryTestFixture: (fixtureId) =>
        set((state) => {
          const fixture = getHistoryTestFixture(fixtureId);
          if (!fixture || !state.gameState) return state;
          const settlementId = `fixture:${state.gameState.gameId}:${fixture.id}`;
          if (state.processedSettlementIds.includes(settlementId)) return state;
          const transition = settleChoice(state.gameState, {}, {
            eventId: fixture.eventId,
            choiceId: fixture.choiceId,
          });
          const history = processStructuredSettlement({
            weeklyHistory: state.weeklyHistory,
            choiceHistory: state.choiceHistory,
            eventHistory: state.eventHistory,
            storyFlags: state.storyFlags,
            processedSettlementIds: state.processedSettlementIds,
            memories: state.memories,
          }, transition.gameState, {
            settlementId,
            week: state.gameState.week,
            event: {
              recordId: fixture.eventRecordId,
              eventId: fixture.eventId,
              category: fixture.category,
              eventTags: fixture.eventTags,
            },
            choice: {
              choiceId: fixture.choiceId,
              choiceText: fixture.choiceText,
              choiceTags: fixture.choiceTags,
              isImportantRelationshipEvent: fixture.isImportantRelationshipEvent,
            },
            beforeState: transition.changeLog.before,
            afterState: transition.changeLog.after,
            relationshipStageBefore: transition.changeLog.relationshipStageBefore,
            relationshipStageAfter: transition.changeLog.relationshipStageAfter,
            outcome: fixture.outcome,
          });
          return {
            stateChangeLog: [...state.stateChangeLog, transition.changeLog],
            weeklyHistory: history.weeklyHistory,
            choiceHistory: history.choiceHistory,
            eventHistory: history.eventHistory,
            storyFlags: history.storyFlags,
            processedSettlementIds: history.processedSettlementIds,
            memories: history.memories,
          };
        }),
      generateNextMockEvent: () =>
        set((state) => {
          if (!state.gameState) return state;
          const eventEngineResult = runEventEngine(state.gameState, {
            history: state.eventHistory,
            seed: state.eventSeed,
          });
          const selectedEvent = eventEngineResult.selectedEvent?.event;
          const selectedRecord = selectedEvent
            ? createEventHistoryEntry(selectedEvent, state.gameState, state.eventHistory.length)
            : null;
          return {
            eventEngineResult,
            selectedEventId: selectedEvent?.id ?? null,
            selectedEventRecordId: selectedRecord?.recordId ?? null,
            eventHistory: selectedRecord ? [...state.eventHistory, selectedRecord] : state.eventHistory,
            eventSeed: state.eventSeed + 1,
          };
        }),
      setHydrated: (hasHydrated) => set({ hasHydrated }),
      reset: () =>
        set({
          draft: { ...initialDraft },
          gameState: null,
          playerConfirmed: false,
          characterConfirmed: false,
          entered: false,
          ...initialStoryUI,
          ...initialEventUI,
        }),
    }),
    {
      name: "garden-phase-2",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        draft: state.draft,
        gameState: state.gameState,
        playerConfirmed: state.playerConfirmed,
        characterConfirmed: state.characterConfirmed,
        entered: state.entered,
        receipt: state.receipt,
        freeAction: state.freeAction,
        storyIndex: state.storyIndex,
        previousChoice: state.previousChoice,
        eventHistory: state.eventHistory,
        selectedEventId: state.selectedEventId,
        selectedEventRecordId: state.selectedEventRecordId,
        eventSeed: state.eventSeed,
        stateChangeLog: state.stateChangeLog,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<GameStore>;
        return {
          ...currentState,
          ...persisted,
          eventHistory: normalizeEventHistory(persisted.eventHistory),
          weeklyHistory: [],
          choiceHistory: [],
          storyFlags: { ...initialStoryFlags },
          processedSettlementIds: [],
          memories: [],
        };
      },
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);

