"use client";

import { create } from "zustand";
import type { ActionReceipt, CharacterId, PlayerDraft, StoryChoice } from "@/types/ui";
import { mockStories } from "@/mocks/story";

const initialDraft: PlayerDraft = {
  name: "", age: "", identity: "student", customIdentity: "", maleLead: "sion", fanLevel: "passerby", pace: "slow",
};

interface PreviewUIStore {
  draft: PlayerDraft;
  playerConfirmed: boolean;
  characterConfirmed: boolean;
  entered: boolean;
  receipt: ActionReceipt | null;
  freeAction: string;
  storyIndex: number;
  previousChoice: StoryChoice | null;
  patchDraft: (draft: Partial<PlayerDraft>) => void;
  confirmPlayer: (draft: PlayerDraft) => void;
  selectCharacter: (id: CharacterId) => void;
  confirmCharacter: () => void;
  enterPreview: () => void;
  recordAction: (receipt: ActionReceipt) => void;
  advanceMockStory: (id: StoryChoice["id"]) => void;
  setFreeAction: (text: string) => void;
  reset: () => void;
}

const initialStoryUI = { storyIndex: 0, previousChoice: null, receipt: null, freeAction: "" };

// In-memory forms and preview navigation only. No persistence, GameState, or engines.
export const useUIStore = create<PreviewUIStore>((set) => ({
  draft: { ...initialDraft }, playerConfirmed: false, characterConfirmed: false, entered: false,
  ...initialStoryUI,
  patchDraft: (draft) => set((state) => ({ draft: { ...state.draft, ...draft }, playerConfirmed: false, characterConfirmed: false, entered: false, ...initialStoryUI })),
  confirmPlayer: (draft) => set({ draft, playerConfirmed: true, characterConfirmed: false, entered: false, ...initialStoryUI }),
  selectCharacter: (id) => set((state) => ({ draft: { ...state.draft, maleLead: id }, characterConfirmed: false, entered: false, ...initialStoryUI })),
  confirmCharacter: () => set({ characterConfirmed: true }),
  enterPreview: () => set({ entered: true }),
  recordAction: (receipt) => set({ receipt }),
  advanceMockStory: (id) => set((state) => {
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
  reset: () => set({ draft: { ...initialDraft }, playerConfirmed: false, characterConfirmed: false, entered: false, ...initialStoryUI }),
}));
