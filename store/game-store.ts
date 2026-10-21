"use client";

import { create } from "zustand";
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
import { createLocalStorageAdapter } from "@/storage/localStorageAdapter";
import { createSaveRepository, SaveRepositoryError, type SaveRepository } from "@/storage/saveRepository";
import type { CharacterBoundaryId, CharacterId } from "@/types/character";
import type { EventEngineResult, EventHistoryEntry } from "@/types/event";
import type { GameModeId, GameState, PlayerDraft, StatId } from "@/types/game";
import type { ChoiceHistoryRecord, StoryFlagState, WeeklyStateSnapshot } from "@/types/history";
import type { MemoryRecord } from "@/types/memory";
import type { GameSave, GameSaveData, SaveSummary } from "@/types/save";
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

let browserSaveRepository: SaveRepository | null = null;

function getSaveRepository(): SaveRepository {
  if (typeof window === "undefined") {
    throw new SaveRepositoryError("storage_unavailable", "localStorage is unavailable on the server.");
  }
  browserSaveRepository ??= createSaveRepository(createLocalStorageAdapter(window.localStorage));
  return browserSaveRepository;
}

export interface GameStore {
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
  activeSaveId: string | null;
  activeSaveCreatedAt: string | null;
  activeSaveUpdatedAt: string | null;
  saveSummaries: SaveSummary[];
  saveError: string | null;
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
  initializePersistence: () => void;
  saveNow: () => boolean;
  loadSave: (saveId: string) => boolean;
  deleteSave: (saveId: string) => void;
  startNewGame: () => void;
  createTestSave: () => boolean;
  reset: () => void;
}

function getSaveData(state: GameStore): GameSaveData | null {
  if (!state.gameState) return null;
  return {
    playerSetup: { ...state.draft },
    gameState: {
      ...state.gameState,
      player: { ...state.gameState.player },
      stats: { ...state.gameState.stats },
    },
    eventHistory: state.eventHistory,
    choiceHistory: state.choiceHistory,
    weeklyStateHistory: state.weeklyHistory,
    storyFlags: { ...state.storyFlags },
    memories: state.memories,
    processedSettlementIds: state.processedSettlementIds,
    runtime: {
      playerConfirmed: state.playerConfirmed,
      characterConfirmed: state.characterConfirmed,
      entered: state.entered,
      storyIndex: state.storyIndex,
      previousChoice: state.previousChoice,
      receipt: state.receipt,
      selectedEventId: state.selectedEventId,
      selectedEventRecordId: state.selectedEventRecordId,
      eventSeed: state.eventSeed,
    },
  };
}

function saveToRuntime(save: GameSave): Partial<GameStore> {
  return {
    draft: save.playerSetup,
    gameState: save.gameState,
    playerConfirmed: save.runtime.playerConfirmed,
    characterConfirmed: save.runtime.characterConfirmed,
    entered: save.runtime.entered,
    storyIndex: save.runtime.storyIndex,
    previousChoice: save.runtime.previousChoice,
    receipt: save.runtime.receipt,
    freeAction: "",
    eventHistory: save.eventHistory,
    selectedEventId: save.runtime.selectedEventId,
    selectedEventRecordId: save.runtime.selectedEventRecordId,
    eventSeed: save.runtime.eventSeed,
    eventEngineResult: null,
    stateChangeLog: [],
    weeklyHistory: save.weeklyStateHistory,
    choiceHistory: save.choiceHistory,
    storyFlags: save.storyFlags,
    processedSettlementIds: save.processedSettlementIds,
    memories: save.memories,
    activeSaveId: save.saveId,
    activeSaveCreatedAt: save.createdAt,
    activeSaveUpdatedAt: save.updatedAt,
    saveError: null,
  };
}

export const useGameStore = create<GameStore>()((set, get) => {
  const persistCurrentState = (): boolean => {
    const state = get();
    const data = getSaveData(state);
    if (!data) return false;
    try {
      const repository = getSaveRepository();
      const saveId = state.activeSaveId ?? data.gameState.gameId;
      let saved: GameSave;
      try {
        const existing = repository.loadGame(saveId);
        saved = repository.saveGame({ ...existing, ...data });
      } catch (error) {
        if (!(error instanceof SaveRepositoryError) || error.code !== "not_found") throw error;
        saved = repository.createSave(data, saveId);
      }
      repository.setActiveSaveId(saved.saveId);
      set({
        activeSaveId: saved.saveId,
        activeSaveCreatedAt: saved.createdAt,
        activeSaveUpdatedAt: saved.updatedAt,
        saveSummaries: repository.listSaves(),
        saveError: null,
      });
      return true;
    } catch (error) {
      set({ saveError: error instanceof Error ? `Unable to save game: ${error.message}` : "Unable to save game." });
      return false;
    }
  };

  const saveAfter = (action: () => void) => {
    action();
    persistCurrentState();
  };

  return {
      draft: { ...initialDraft },
      gameState: null,
      playerConfirmed: false,
      characterConfirmed: false,
      entered: false,
      hasHydrated: false,
      activeSaveId: null,
      activeSaveCreatedAt: null,
      activeSaveUpdatedAt: null,
      saveSummaries: [],
      saveError: null,
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
      confirmPlayer: (draft) => saveAfter(() => {
        set({
          draft,
          gameState: createInitialGameState(draft),
          playerConfirmed: true,
          characterConfirmed: false,
          entered: false,
          ...initialStoryUI,
          ...initialEventUI,
          activeSaveId: null,
          activeSaveCreatedAt: null,
          activeSaveUpdatedAt: null,
          saveError: null,
        });
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
        persistCurrentState();
      },
      enterGame: () => {
        const { draft, gameState } = get();
        set({ gameState: gameState ?? createInitialGameState(draft), entered: true });
        persistCurrentState();
      },
      recordAction: (receipt) => saveAfter(() => set({ receipt })),
      advanceMockStory: (id) => {
        saveAfter(() => set((state) => {
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
        }));
      },
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
      applyMockChoice: (eventId, choiceId, boundaryId) => {
        saveAfter(() => set((state) => {
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
        }));
      },
      applyHistoryTestFixture: (fixtureId) => {
        saveAfter(() => set((state) => {
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
        }));
      },
      generateNextMockEvent: () => {
        saveAfter(() => set((state) => {
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
        }));
      },
      initializePersistence: () => {
        try {
          const repository = getSaveRepository();
          const saveSummaries = repository.listSaves();
          const activeSaveId = repository.getActiveSaveId();
          if (!activeSaveId) {
            set({ saveSummaries, hasHydrated: true, saveError: null });
            return;
          }
          const save = repository.loadGame(activeSaveId);
          set({ ...saveToRuntime(save), saveSummaries, hasHydrated: true });
        } catch (error) {
          set({
            hasHydrated: true,
            saveError: error instanceof Error ? `Unable to load save: ${error.message}` : "Unable to load save.",
          });
        }
      },
      saveNow: () => persistCurrentState(),
      loadSave: (saveId) => {
        try {
          const repository = getSaveRepository();
          const save = repository.loadGame(saveId);
          repository.setActiveSaveId(saveId);
          set({ ...saveToRuntime(save), saveSummaries: repository.listSaves(), hasHydrated: true });
          return true;
        } catch (error) {
          set({ saveError: error instanceof Error ? `Unable to load save: ${error.message}` : "Unable to load save." });
          return false;
        }
      },
      deleteSave: (saveId) => {
        try {
          const repository = getSaveRepository();
          const deletingActive = get().activeSaveId === saveId;
          repository.deleteSave(saveId);
          const saveSummaries = repository.listSaves();
          if (deletingActive) {
            set({
              draft: { ...initialDraft },
              gameState: null,
              playerConfirmed: false,
              characterConfirmed: false,
              entered: false,
              ...initialStoryUI,
              ...initialEventUI,
              activeSaveId: null,
              activeSaveCreatedAt: null,
              activeSaveUpdatedAt: null,
              saveSummaries,
              saveError: null,
            });
          } else {
            set({ saveSummaries, saveError: null });
          }
        } catch (error) {
          set({ saveError: error instanceof Error ? `Unable to delete save: ${error.message}` : "Unable to delete save." });
        }
      },
      startNewGame: () => {
        try {
          getSaveRepository().setActiveSaveId(null);
        } catch {
          // Runtime reset remains safe even when browser storage is unavailable.
        }
        set((state) => ({
          draft: { ...initialDraft },
          gameState: null,
          playerConfirmed: false,
          characterConfirmed: false,
          entered: false,
          ...initialStoryUI,
          ...initialEventUI,
          activeSaveId: null,
          activeSaveCreatedAt: null,
          activeSaveUpdatedAt: null,
          saveError: null,
          saveSummaries: state.saveSummaries,
          hasHydrated: true,
        }));
      },
      createTestSave: () => {
        const state = get();
        if (!state.gameState) return false;
        try {
          const repository = getSaveRepository();
          const previousActive = repository.getActiveSaveId();
          const testGameState = createInitialGameState(state.draft);
          repository.createSave({
            playerSetup: { ...state.draft },
            gameState: testGameState,
            eventHistory: [],
            choiceHistory: [],
            weeklyStateHistory: [],
            storyFlags: { ...initialStoryFlags },
            memories: [],
            processedSettlementIds: [],
            runtime: {
              playerConfirmed: true,
              characterConfirmed: false,
              entered: false,
              storyIndex: 0,
              previousChoice: null,
              receipt: null,
              selectedEventId: null,
              selectedEventRecordId: null,
              eventSeed: 1,
            },
          }, testGameState.gameId);
          repository.setActiveSaveId(previousActive);
          set({ saveSummaries: repository.listSaves(), saveError: null });
          return true;
        } catch (error) {
          set({ saveError: error instanceof Error ? `Unable to create test save: ${error.message}` : "Unable to create test save." });
          return false;
        }
      },
      reset: () => get().startNewGame(),
  };
});

