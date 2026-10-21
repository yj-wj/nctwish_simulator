"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createInitialGameState } from "@/game/create-initial-game-state";
import { mockStories } from "@/mocks/story";
import type { CharacterId } from "@/types/character";
import type { GameState, PlayerDraft } from "@/types/game";
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
  patchDraft: (draft: Partial<PlayerDraft>) => void;
  confirmPlayer: (draft: PlayerDraft) => void;
  selectCharacter: (id: CharacterId) => void;
  confirmCharacter: () => void;
  enterGame: () => void;
  recordAction: (receipt: ActionReceipt) => void;
  advanceMockStory: (id: StoryChoice["id"]) => void;
  setFreeAction: (text: string) => void;
  setAffection: (affection: number) => void;
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
      patchDraft: (patch) =>
        set((state) => ({
          draft: { ...state.draft, ...patch },
          gameState: null,
          playerConfirmed: false,
          characterConfirmed: false,
          entered: false,
          ...initialStoryUI,
        })),
      confirmPlayer: (draft) =>
        set({
          draft,
          gameState: createInitialGameState(draft),
          playerConfirmed: true,
          characterConfirmed: false,
          entered: false,
          ...initialStoryUI,
        }),
      selectCharacter: (id) =>
        set((state) => ({
          draft: { ...state.draft, maleLeadId: id },
          gameState: state.gameState ? { ...state.gameState, maleLead: id } : null,
          characterConfirmed: false,
          entered: false,
          ...initialStoryUI,
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
          if (!choice) return state;
          return {
            storyIndex: (state.storyIndex + 1) % mockStories.length,
            previousChoice: choice,
            receipt: { label: choice.text, response: `已选择 ${choice.id}：已切换到下一段固定 Mock 剧情，属性与周数不变。` },
            freeAction: "",
          };
        }),
      setFreeAction: (freeAction) => set({ freeAction }),
      setAffection: (affection) =>
        set((state) => ({
          gameState: state.gameState
            ? { ...state.gameState, stats: { ...state.gameState.stats, affection: Math.min(100, Math.max(0, affection)) } }
            : null,
        })),
      setHydrated: (hasHydrated) => set({ hasHydrated }),
      reset: () =>
        set({
          draft: { ...initialDraft },
          gameState: null,
          playerConfirmed: false,
          characterConfirmed: false,
          entered: false,
          ...initialStoryUI,
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
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);

