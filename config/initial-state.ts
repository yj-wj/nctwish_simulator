import type { InitialStatsConfig } from "@/types/game";

// Range capability comes from GAME_SPEC. Phase 2 uses the opening-template examples
// deterministically; random initialization and identity-based money rules remain undefined.
export const initialStatsConfig: InitialStatsConfig = {
  affection: { min: 0, max: 10, example: 8 },
  popularity: { fixed: 0, example: 0 },
  mood: { fixed: 70, example: 72 },
  money: { min: 800, max: 5000, example: 2300 },
  secrecy: { fixed: 100, example: 100 },
  companyAlert: { min: 10, max: 40, example: 18 },
  careerPressure: { min: 40, max: 80, example: 67 },
};

export const initialContextConfig = {
  week: 1,
  currentScene: "首尔汝矣岛电视台后门",
  careerStage: "回归期",
} as const;

