export type PlayerIdentityId =
  | "student"
  | "fan"
  | "intern"
  | "staff"
  | "stylist"
  | "translator"
  | "part-time"
  | "custom";

export type FanLevelId = "longtime" | "casual" | "passerby" | "returning" | "single";

export interface PlayerIdentity {
  id: PlayerIdentityId;
  name: string;
  description: string;
  advantages: string[];
  risks: string[];
}

export interface FanLevel {
  id: FanLevelId;
  name: string;
}

export interface Player {
  name: string;
  age: number;
  identityId: PlayerIdentityId;
  customIdentity?: string;
  fanLevelId: FanLevelId;
}

