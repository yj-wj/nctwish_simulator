"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  initialEndingHistoryMetrics,
  initialEndingStoryFlags,
} from "@/config/endings";
import { mockChoiceEffects } from "@/config/mock-choice-effects";
import { createInitialGameState } from "@/game/create-initial-game-state";
import { createEventHistoryEntry, runEventEngine } from "@/game/eventEngine";
import { evaluateAction } from "@/game/ruleEngine";
import { setGameStateForDebug, settleChoice } from "@/game/stateEngine";
import { mockStories } from "@/mocks/story";
import type { CharacterBoundaryId, CharacterId } from "@/types/character";
import type {
  EndingContext,
  EndingHistoryMetricId,
  EndingStoryFlagId,
} from "@/types/ending";
import type { EventEngineResult, EventHistoryEntry } from "@/types/event";
import type { GameModeId, GameState, PlayerDraft, StatId } from "@/types/game";
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
const createInitialEndingContext = (): EndingContext => ({
  historyMetrics: { ...initialEndingHistoryMetrics },
  storyFlags: { ...initialEndingStoryFlags },
});

function normalizeEndingContext(value: unknown): EndingContext {
  if (!value || typeof value !== "object") return createInitialEndingContext();
  const context = value as Partial<EndingContext>;
  return {
    historyMetrics: { ...initialEndingHistoryMetrics, ...context.historyMetrics },
    storyFlags: { ...initialEndingStoryFlags, ...context.storyFlags },
  };
}

const initialEventUI = {
  eventHistory: [] as EventHistoryEntry[],
  selectedEventId: null as string | null,
  eventEngineResult: null as EventEngineResult | null,
  eventSeed: 1,
  stateChangeLog: [] as StateChangeLogEntry[],
  endingContext: createInitialEndingContext(),
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
  stateChangeLog: StateChangeLogEntry[];
  endingContext: EndingContext;
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
  setEndingHistoryMetric: (metric: EndingHistoryMetricId, value: number) => void;
  setEndingStoryFlag: (flag: EndingStoryFlagId, value: boolean) => void;
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
          const transition = settleChoice(state.gameState, choice.effects, {
            eventId: state.selectedEventId ?? mockStories[state.storyIndex].id,
            choiceId: choice.id,
          });
          const eventEngineResult = runEventEngine(transition.gameState, {
            history: state.eventHistory,
            seed: state.eventSeed,
          });
          const selectedEvent = eventEngineResult.selectedEvent?.event;
          return {
            gameState: transition.gameState,
            storyIndex: (state.storyIndex + 1) % mockStories.length,
            previousChoice: choice,
            receipt: { label: choice.text, response: `已选择 ${choice.id}：State Engine 已结算结构化 Mock Effect。` },
            freeAction: "",
            eventEngineResult,
            selectedEventId: selectedEvent?.id ?? null,
            eventHistory: selectedEvent
              ? [...state.eventHistory, createEventHistoryEntry(selectedEvent, transition.gameState)]
              : state.eventHistory,
            eventSeed: state.eventSeed + 1,
            stateChangeLog: [...state.stateChangeLog, transition.changeLog],
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
          return {
            gameState: transition.gameState,
            eventEngineResult: null,
            stateChangeLog: [...state.stateChangeLog, transition.changeLog],
          };
        }),
      setEndingHistoryMetric: (metric, value) =>
        set((state) => ({
          endingContext: {
            ...state.endingContext,
            historyMetrics: {
              ...state.endingContext.historyMetrics,
              [metric]: Math.max(0, Math.round(Number.isFinite(value) ? value : 0)),
            },
          },
        })),
      setEndingStoryFlag: (flag, value) =>
        set((state) => ({
          endingContext: {
            ...state.endingContext,
            storyFlags: { ...state.endingContext.storyFlags, [flag]: value },
          },
        })),
      generateNextMockEvent: () =>
        set((state) => {
          if (!state.gameState) return state;
          const eventEngineResult = runEventEngine(state.gameState, {
            history: state.eventHistory,
            seed: state.eventSeed,
          });
          const selectedEvent = eventEngineResult.selectedEvent?.event;
          return {
            eventEngineResult,
            selectedEventId: selectedEvent?.id ?? null,
            eventHistory: selectedEvent
              ? [...state.eventHistory, createEventHistoryEntry(selectedEvent, state.gameState)]
              : state.eventHistory,
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
        eventSeed: state.eventSeed,
        stateChangeLog: state.stateChangeLog,
        endingContext: state.endingContext,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<GameStore>;
        return {
          ...currentState,
          ...persisted,
          endingContext: normalizeEndingContext(persisted.endingContext),
        };
      },
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);

