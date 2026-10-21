import type { CharacterId } from "./character";
import type { FanLevelId, Player, PlayerIdentityId } from "./player";

export type GameModeId = "slow" | "standard" | "pressure" | "healing";

export interface GameMode {
  id: GameModeId;
  name: string;
  description: string;
}

export type StatId =
  | "affection"
  | "popularity"
  | "mood"
  | "money"
  | "secrecy"
  | "companyAlert"
  | "careerPressure";

export interface GameStats {
  affection: number;
  popularity: number;
  mood: number;
  money: number;
  secrecy: number;
  companyAlert: number;
  careerPressure: number;
}

export type RelationshipStageId =
  | "strangers"
  | "noticed"
  | "interested"
  | "ambiguous"
  | "committed"
  | "inLove"
  | "trial";

export interface RelationshipStage {
  id: RelationshipStageId;
  name: string;
  minAffection: number;
  maxAffection: number;
  allowedInteractions: string[];
  prohibitedInteractions: string[];
  typicalInteractions: string[];
}

export type CareerStage = "回归期" | "巡演期" | "个人活动期" | "拍摄期" | "休整期";

export interface GameState {
  gameId: string;
  week: number;
  currentScene: string;
  careerStage: CareerStage;
  player: Player;
  maleLead: CharacterId;
  gameMode: GameModeId;
  stats: GameStats;
}

export interface PlayerDraft {
  name: string;
  age: string;
  identityId: PlayerIdentityId;
  customIdentity: string;
  maleLeadId: CharacterId;
  fanLevelId: FanLevelId;
  gameModeId: GameModeId;
}

export interface InitialNumberConfig {
  fixed?: number;
  min?: number;
  max?: number;
  example: number;
}

export type InitialStatsConfig = Record<StatId, InitialNumberConfig>;

