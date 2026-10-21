"use client";

import { create } from "zustand";
import { eventPool } from "@/config/event-pool";
import { getHistoryTestFixture } from "@/config/history-fixtures";
import { initialStoryFlags } from "@/config/history";
import { mockChoiceEffects } from "@/config/mock-choice-effects";
import { generatedChoiceDefaults } from "@/config/turn-policy";
import { generateChatWithServer, generateStoryWithServer, interpretActionWithServer, AIClientError } from "@/ai/client";
import { createInitialGameState } from "@/game/create-initial-game-state";
import { createEventHistoryEntry, runEventEngine } from "@/game/eventEngine";
import { evaluateAction } from "@/game/ruleEngine";
import { processStructuredSettlement } from "@/game/settlementPipeline";
import { setGameStateForDebug, settleChoice } from "@/game/stateEngine";
import { createTurnId, executeTurnTransaction, TurnEngineError } from "@/game/turnEngine";
import { getRelationshipStage } from "@/game/relationship";
import { appendRecentStoryOpening, extractStoryOpening } from "@/game/contextBuilder";
import { executeChatTransaction, getChatThreadId } from "@/game/chatEngine";
import { incomingMessageFixtures } from "@/config/chat";
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
import type { StoryGenerationOutput } from "@/ai/schemas";
import type { AIBadcaseRecord, TurnDomainState, TurnPlayerInput, TurnStatus, TurnTrace } from "@/types/turn";
import type { ChatDomainState, ChatMessage, ChatThread, ChatTurnRecord, ChatTurnStatus, ChatTurnTrace, IncomingMessageTrigger } from "@/types/chat";

const initialDraft: PlayerDraft = {
  name: "",
  age: "",
  identityId: "student",
  customIdentity: "",
  maleLeadId: "sion",
  fanLevelId: "passerby",
  gameModeId: "slow",
};

const initialStoryUI = {
  storyIndex: 0,
  previousChoice: null as StoryChoice | null,
  receipt: null as ActionReceipt | null,
  freeAction: "",
  currentStory: null as StoryGenerationOutput | null,
  recentStoryOpenings: [extractStoryOpening(mockStories[0].paragraphs[0])],
  turnStatus: "idle" as TurnStatus,
  turnError: null as string | null,
  activeTurnId: null as string | null,
  lastTurnTrace: null as TurnTrace | null,
  aiBadcases: [] as AIBadcaseRecord[],
};

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

const initialChatUI = {
  chatThreads: [] as ChatThread[],
  chatMessages: [] as ChatMessage[],
  chatTurns: [] as ChatTurnRecord[],
  incomingMessageTriggers: [] as IncomingMessageTrigger[],
  chatInput: "",
  chatStatus: "idle" as ChatTurnStatus,
  chatError: null as string | null,
  lastChatTrace: null as ChatTurnTrace | null,
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
  currentStory: StoryGenerationOutput | null;
  recentStoryOpenings: string[];
  turnStatus: TurnStatus;
  turnError: string | null;
  activeTurnId: string | null;
  lastTurnTrace: TurnTrace | null;
  aiBadcases: AIBadcaseRecord[];
  chatThreads: ChatThread[];
  chatMessages: ChatMessage[];
  chatTurns: ChatTurnRecord[];
  incomingMessageTriggers: IncomingMessageTrigger[];
  chatInput: string;
  chatStatus: ChatTurnStatus;
  chatError: string | null;
  lastChatTrace: ChatTurnTrace | null;
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
  processPresetChoice: (id: StoryChoice["id"]) => Promise<boolean>;
  processFreeAction: () => Promise<boolean>;
  setChatInput: (text: string) => void;
  sendChatMessage: (threadId: string) => Promise<boolean>;
  markChatRead: (threadId: string) => void;
  enqueueIncomingFixture: (fixtureId: string) => void;
  processPendingIncoming: () => Promise<boolean>;
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
    chatThreads: state.chatThreads,
    chatMessages: state.chatMessages,
    chatTurns: state.chatTurns,
    incomingMessageTriggers: state.incomingMessageTriggers,
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
      currentStory: state.currentStory,
      recentStoryOpenings: state.recentStoryOpenings,
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
    currentStory: save.runtime.currentStory ?? null,
    recentStoryOpenings: save.runtime.recentStoryOpenings
      ?? (save.runtime.currentStory ? [extractStoryOpening(save.runtime.currentStory.story)] : []),
    turnStatus: "idle",
    turnError: null,
    activeTurnId: null,
    lastTurnTrace: null,
    aiBadcases: [],
    chatThreads: save.chatThreads,
    chatMessages: save.chatMessages,
    chatTurns: save.chatTurns,
    incomingMessageTriggers: save.incomingMessageTriggers,
    chatInput: "",
    chatStatus: "idle",
    chatError: null,
    lastChatTrace: null,
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
  const writeSaveData = (data: GameSaveData, state: GameStore): GameSave => {
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
    return saved;
  };

  const persistCurrentState = (): boolean => {
    const state = get();
    const data = getSaveData(state);
    if (!data) return false;
    try {
      const repository = getSaveRepository();
      const saved = writeSaveData(data, state);
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

  const runFormalTurn = async (
    snapshot: GameStore,
    input: TurnPlayerInput,
    selectedChoice: StoryChoice | null,
  ): Promise<boolean> => {
    if (!snapshot.gameState) return false;
    const domain: TurnDomainState = {
      gameState: snapshot.gameState,
      eventHistory: snapshot.eventHistory,
      choiceHistory: snapshot.choiceHistory,
      weeklyHistory: snapshot.weeklyHistory,
      storyFlags: snapshot.storyFlags,
      memories: snapshot.memories,
      processedSettlementIds: snapshot.processedSettlementIds,
      selectedEventId: snapshot.selectedEventId,
      selectedEventRecordId: snapshot.selectedEventRecordId,
      eventSeed: snapshot.eventSeed,
      recentStoryOpenings: snapshot.recentStoryOpenings,
    };
    const turnId = createTurnId(domain, input);
    set({
      activeTurnId: turnId,
      turnStatus: input.kind === "free_action" ? "interpreting" : "generating",
      turnError: null,
    });

    try {
      await executeTurnTransaction(domain, input, {
        interpretAction: interpretActionWithServer,
        generateStory: generateStoryWithServer,
        onStatus: (turnStatus) => set({ turnStatus }),
      }, {
        persist: (result) => {
          const recentStoryOpenings = appendRecentStoryOpening(snapshot.recentStoryOpenings, result.story.story);
          const patch: Partial<GameStore> = {
            gameState: result.gameState,
            eventHistory: result.eventHistory,
            choiceHistory: result.choiceHistory,
            weeklyHistory: result.weeklyHistory,
            storyFlags: result.storyFlags,
            memories: result.memories,
            processedSettlementIds: result.processedSettlementIds,
            stateChangeLog: [...snapshot.stateChangeLog, result.stateChangeLog],
            eventEngineResult: result.eventEngineResult,
            selectedEventId: result.selectedEventId,
            selectedEventRecordId: result.selectedEventRecordId,
            eventSeed: result.eventSeed,
            currentStory: result.story,
            recentStoryOpenings,
            previousChoice: selectedChoice ?? snapshot.previousChoice,
            receipt: {
              label: input.kind === "preset_choice" ? input.choice.text : input.text.trim(),
              response: "本回合已通过规则检查、AI 生成和 State Engine 正式结算。",
            },
            freeAction: "",
          };
          const data = getSaveData({ ...snapshot, ...patch } as GameStore);
          if (!data) throw new SaveRepositoryError("invalid_schema", "Turn produced no saveable game state.");
          return writeSaveData(data, snapshot);
        },
        commit: (result, persisted) => {
          const saved = persisted as GameSave;
          const recentStoryOpenings = appendRecentStoryOpening(snapshot.recentStoryOpenings, result.story.story);
          const rejectedSuggestions = [
            ...result.trace.settlementProposal.rejectedEffects.map(({ stat, magnitude, rejectionReason }) => `${stat}:${magnitude}:${rejectionReason}`),
            ...result.trace.settlementProposal.rejectedChoiceTags.map((tag) => `choiceTag:${tag}`),
            ...result.trace.settlementProposal.rejectedOutcomeTags.map((tag) => `outcomeTag:${tag}`),
            ...result.trace.settlementProposal.rejectedMemories.map(({ summary, reason }) => `memory:${summary}:${reason}`),
          ];
          const rejectionBadcase: AIBadcaseRecord | null = rejectedSuggestions.length > 0 ? {
            turnId: result.turnId,
            model: result.trace.storyMetadata.model,
            playerAction: result.trace.playerInput,
            relationshipStage: result.trace.relationshipStageBefore,
            errorType: "rejected_suggestions",
            validationErrors: [],
            rejectedSuggestions,
            occurredAt: new Date().toISOString(),
          } : null;
          set({
            gameState: result.gameState,
            eventHistory: result.eventHistory,
            choiceHistory: result.choiceHistory,
            weeklyHistory: result.weeklyHistory,
            storyFlags: result.storyFlags,
            memories: result.memories,
            processedSettlementIds: result.processedSettlementIds,
            stateChangeLog: [...snapshot.stateChangeLog, result.stateChangeLog],
            eventEngineResult: result.eventEngineResult,
            selectedEventId: result.selectedEventId,
            selectedEventRecordId: result.selectedEventRecordId,
            eventSeed: result.eventSeed,
            currentStory: result.story,
            recentStoryOpenings,
            previousChoice: selectedChoice ?? snapshot.previousChoice,
            receipt: {
              label: input.kind === "preset_choice" ? input.choice.text : input.text.trim(),
              response: "本回合已通过规则检查、AI 生成和 State Engine 正式结算。",
            },
            freeAction: "",
            lastTurnTrace: result.trace,
            aiBadcases: process.env.NODE_ENV === "development" && rejectionBadcase
              ? [...snapshot.aiBadcases, rejectionBadcase]
              : snapshot.aiBadcases,
            activeTurnId: null,
            turnStatus: "completed",
            turnError: null,
            activeSaveId: saved.saveId,
            activeSaveCreatedAt: saved.createdAt,
            activeSaveUpdatedAt: saved.updatedAt,
            saveSummaries: getSaveRepository().listSaves(),
            saveError: null,
          });
        },
      });
      return true;
    } catch (error) {
      const isInputError = error instanceof TurnEngineError && error.code === "invalid_action";
      const message = isInputError ? error.message : "本回合生成失败，请重试。";
      const errorType = error instanceof TurnEngineError
        ? error.code
        : error instanceof AIClientError
          ? error.code
          : error instanceof SaveRepositoryError
            ? error.code
            : "unknown_error";
      const validationErrors = error instanceof TurnEngineError
        ? error.issues
        : [error instanceof Error ? error.message : "Unknown turn error."];
      const badcase: AIBadcaseRecord = {
        turnId,
        model: error instanceof AIClientError ? error.metadata?.model ?? "unavailable" : "unavailable",
        playerAction: input.kind === "preset_choice" ? input.choice.text : input.text.trim(),
        relationshipStage: getRelationshipStage(snapshot.gameState.stats.affection).id,
        errorType,
        validationErrors,
        rejectedSuggestions: [],
        occurredAt: new Date().toISOString(),
      };
      set((current) => ({
        activeTurnId: null,
        turnStatus: "error",
        turnError: message,
        aiBadcases: process.env.NODE_ENV === "development" ? [...current.aiBadcases, badcase] : current.aiBadcases,
        ...(error instanceof SaveRepositoryError ? { saveError: `Unable to save turn: ${error.message}` } : {}),
      }));
      return false;
    }
  };

  const runChatTurn = async (
    snapshot: GameStore,
    input: Parameters<typeof executeChatTransaction>[1],
  ): Promise<boolean> => {
    if (!snapshot.gameState) return false;
    const domain: ChatDomainState = {
      gameState: snapshot.gameState,
      eventHistory: snapshot.eventHistory,
      choiceHistory: snapshot.choiceHistory,
      weeklyHistory: snapshot.weeklyHistory,
      storyFlags: snapshot.storyFlags,
      memories: snapshot.memories,
      processedSettlementIds: snapshot.processedSettlementIds,
      chatThreads: snapshot.chatThreads,
      chatMessages: snapshot.chatMessages,
      chatTurns: snapshot.chatTurns,
    };
    set({ chatStatus: "generating", chatError: null });
    try {
      await executeChatTransaction(domain, input, {
        generateChat: generateChatWithServer,
        onStatus: (chatStatus) => set({ chatStatus }),
      }, {
        persist: (result) => {
          const incomingMessageTriggers = input.kind === "incoming"
            ? snapshot.incomingMessageTriggers.map((trigger) => trigger.id === input.trigger.id ? { ...trigger, status: "delivered" as const } : trigger)
            : snapshot.incomingMessageTriggers;
          const patch: Partial<GameStore> = {
            gameState: result.gameState,
            eventHistory: result.eventHistory,
            choiceHistory: result.choiceHistory,
            weeklyHistory: result.weeklyHistory,
            storyFlags: result.storyFlags,
            memories: result.memories,
            processedSettlementIds: result.processedSettlementIds,
            chatThreads: result.chatThreads,
            chatMessages: result.chatMessages,
            chatTurns: result.chatTurns,
            incomingMessageTriggers,
            stateChangeLog: result.stateChangeLog ? [...snapshot.stateChangeLog, result.stateChangeLog] : snapshot.stateChangeLog,
            chatInput: input.kind === "player_message" ? "" : snapshot.chatInput,
          };
          const data = getSaveData({ ...snapshot, ...patch } as GameStore);
          if (!data) throw new SaveRepositoryError("invalid_schema", "Chat turn produced no saveable state.");
          return writeSaveData(data, snapshot);
        },
        commit: (result, persisted) => {
          const saved = persisted as GameSave;
          const incomingMessageTriggers = input.kind === "incoming"
            ? snapshot.incomingMessageTriggers.map((trigger) => trigger.id === input.trigger.id ? { ...trigger, status: "delivered" as const } : trigger)
            : snapshot.incomingMessageTriggers;
          const rejectedSuggestions = [
            ...result.trace.proposal.effects.rejected.map(({ stat, magnitude, rejectionReason }) => `${stat}:${magnitude}:${rejectionReason}`),
            ...result.trace.proposal.rejectedChoiceTags.map((tag) => `choiceTag:${tag}`),
            ...result.trace.proposal.rejectedOutcomeTags.map((tag) => `outcomeTag:${tag}`),
            ...result.trace.proposal.rejectedMemories.map(({ summary, reason }) => `memory:${summary}:${reason}`),
            ...(result.trace.proposal.spamLimited ? ["relationship_effect:chat_spam_cooldown"] : []),
          ];
          const rejectionBadcase: AIBadcaseRecord | null = rejectedSuggestions.length ? {
            turnId: result.turnId,
            model: result.trace.metadata.model,
            playerAction: input.kind === "player_message" ? input.content : input.trigger.reason,
            relationshipStage: getRelationshipStage(result.trace.beforeState.stats.affection).id,
            errorType: "rejected_chat_suggestion",
            validationErrors: [], rejectedSuggestions, occurredAt: new Date().toISOString(),
          } : null;
          set({
            gameState: result.gameState,
            eventHistory: result.eventHistory,
            choiceHistory: result.choiceHistory,
            weeklyHistory: result.weeklyHistory,
            storyFlags: result.storyFlags,
            memories: result.memories,
            processedSettlementIds: result.processedSettlementIds,
            chatThreads: result.chatThreads,
            chatMessages: result.chatMessages,
            chatTurns: result.chatTurns,
            incomingMessageTriggers,
            stateChangeLog: result.stateChangeLog ? [...snapshot.stateChangeLog, result.stateChangeLog] : snapshot.stateChangeLog,
            chatInput: input.kind === "player_message" ? "" : snapshot.chatInput,
            chatStatus: "completed",
            chatError: null,
            lastChatTrace: result.trace,
            aiBadcases: process.env.NODE_ENV === "development" && rejectionBadcase
              ? [...snapshot.aiBadcases, rejectionBadcase]
              : snapshot.aiBadcases,
            activeSaveId: saved.saveId,
            activeSaveCreatedAt: saved.createdAt,
            activeSaveUpdatedAt: saved.updatedAt,
            saveSummaries: getSaveRepository().listSaves(),
            saveError: null,
          });
        },
      });
      return true;
    } catch (error) {
      const inputError = error instanceof TurnEngineError && error.code === "invalid_action";
      set((current) => ({
        chatStatus: "error",
        chatError: inputError ? error.message : "消息发送失败，请重试。",
        aiBadcases: process.env.NODE_ENV === "development" ? [...current.aiBadcases, {
          turnId: input.kind === "incoming" ? `chat:${input.trigger.id}` : `chat:${input.threadId}:failed`,
          model: error instanceof AIClientError ? error.metadata?.model ?? "unavailable" : "unavailable",
          playerAction: input.kind === "player_message" ? input.content : input.trigger.reason,
          relationshipStage: getRelationshipStage(snapshot.gameState!.stats.affection).id,
          errorType: error instanceof AIClientError ? error.code : error instanceof TurnEngineError ? error.code : "chat_error",
          validationErrors: [error instanceof Error ? error.message : "Unknown chat error"],
          rejectedSuggestions: [], occurredAt: new Date().toISOString(),
        }] : current.aiBadcases,
      }));
      return false;
    }
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
      ...initialChatUI,
      patchDraft: (patch) =>
        set((state) => ({
          draft: { ...state.draft, ...patch },
          gameState: null,
          playerConfirmed: false,
          characterConfirmed: false,
          entered: false,
          ...initialStoryUI,
          ...initialEventUI,
          ...initialChatUI,
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
          ...initialChatUI,
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
          ...initialChatUI,
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
      processPresetChoice: async (id) => {
        const state = get();
        if (!state.gameState || ["interpreting", "generating", "validating", "settling"].includes(state.turnStatus)) return false;
        const generatedChoice = state.currentStory?.choices.find((choice) => choice.id === id);
        const mockChoice = mockStories[state.storyIndex].choices.find((choice) => choice.id === id);
        const choice: StoryChoice | null = generatedChoice
          ? { id, text: generatedChoice.text, ...generatedChoiceDefaults[id] }
          : mockChoice ?? null;
        if (!choice) return false;
        const input: TurnPlayerInput = { kind: "preset_choice", choice };
        return runFormalTurn(state, input, choice);
      },
      processFreeAction: async () => {
        const state = get();
        if (!state.gameState || ["interpreting", "generating", "validating", "settling"].includes(state.turnStatus)) return false;
        const input: TurnPlayerInput = { kind: "free_action", text: state.freeAction };
        return runFormalTurn(state, input, null);
      },
      setChatInput: (chatInput) => set({ chatInput }),
      sendChatMessage: async (threadId) => {
        const state = get();
        if (!state.gameState || ["generating", "validating", "settling"].includes(state.chatStatus)) return false;
        return runChatTurn(state, { kind: "player_message", threadId, content: state.chatInput });
      },
      markChatRead: (threadId) => {
        const state = get();
        const thread = state.chatThreads.find(({ id }) => id === threadId);
        if (!thread || thread.unreadCount === 0) return;
        saveAfter(() => set({ chatThreads: state.chatThreads.map((item) => item.id === threadId ? { ...item, unreadCount: 0, lastReadSequence: state.chatMessages.filter((message) => message.threadId === threadId).reduce((max, message) => Math.max(max, message.sequence), 0) } : item) }));
      },
      enqueueIncomingFixture: (fixtureId) => {
        if (process.env.NODE_ENV !== "development") return;
        const state = get();
        if (!state.gameState) return;
        const fixture = incomingMessageFixtures.find(({ id }) => id === fixtureId);
        if (!fixture) return;
        const id = `incoming:${state.gameState.gameId}:${state.gameState.week}:${fixture.id}`;
        if (state.incomingMessageTriggers.some((trigger) => trigger.id === id)) return;
        const trigger: IncomingMessageTrigger = {
          id, threadId: getChatThreadId(state.gameState.maleLead), senderId: state.gameState.maleLead,
          reason: fixture.reason, contextTags: [...fixture.tags], week: state.gameState.week, status: "pending",
        };
        saveAfter(() => set({ incomingMessageTriggers: [...state.incomingMessageTriggers, trigger] }));
      },
      processPendingIncoming: async () => {
        const state = get();
        if (!state.gameState || ["generating", "validating", "settling"].includes(state.chatStatus)) return false;
        const threadId = getChatThreadId(state.gameState.maleLead);
        const trigger = state.incomingMessageTriggers.find((item) => item.threadId === threadId && item.status === "pending");
        return trigger ? runChatTurn(state, { kind: "incoming", trigger }) : false;
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
              ...initialChatUI,
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
          ...initialChatUI,
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
            chatThreads: [],
            chatMessages: [],
            chatTurns: [],
            incomingMessageTriggers: [],
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
              currentStory: null,
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

