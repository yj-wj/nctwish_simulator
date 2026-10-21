import { initialContextConfig, initialStatsConfig } from "@/config/initial-state";
import type { GameState, PlayerDraft } from "@/types/game";

function createGameId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `garden-${Date.now()}`;
}

export function createInitialGameState(draft: PlayerDraft, gameId = createGameId()): GameState {
  return {
    gameId,
    week: initialContextConfig.week,
    currentScene: initialContextConfig.currentScene,
    careerStage: initialContextConfig.careerStage,
    player: {
      name: draft.name,
      age: Number(draft.age),
      identityId: draft.identityId,
      customIdentity: draft.identityId === "custom" ? draft.customIdentity : undefined,
      fanLevelId: draft.fanLevelId,
    },
    maleLead: draft.maleLeadId,
    gameMode: draft.gameModeId,
    stats: {
      affection: initialStatsConfig.affection.example,
      popularity: initialStatsConfig.popularity.example,
      mood: initialStatsConfig.mood.example,
      money: initialStatsConfig.money.example,
      secrecy: initialStatsConfig.secrecy.example,
      companyAlert: initialStatsConfig.companyAlert.example,
      careerPressure: initialStatsConfig.careerPressure.example,
    },
  };
}

