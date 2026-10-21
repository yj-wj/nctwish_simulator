/** Phase 1 presentation types only. These are not the future GameState schema. */
export type CharacterId = "sion" | "riku" | "yushi" | "jaehee" | "ryo" | "sakuya";
export type IdentityId = "student" | "fan" | "intern" | "staff" | "stylist" | "translator" | "part-time" | "custom";
export type FanLevelId = "longtime" | "casual" | "passerby" | "returning" | "single";
export type PaceId = "slow" | "standard" | "pressure" | "healing";

export interface PlayerDraft {
  name: string;
  age: string;
  identity: IdentityId;
  customIdentity: string;
  maleLead: CharacterId;
  fanLevel: FanLevelId;
  pace: PaceId;
}

export interface CharacterPreview {
  id: CharacterId;
  name: string;
  stageName: string;
  subtitle: string;
  motif: string;
  color: string;
  tags: string[];
  description: string;
  privateSide: string;
  taboos: string[];
  detail: string;
  visual: { kind: "monogram"; label: string; alt: string };
}

export type StatId = "affection" | "popularity" | "mood" | "money" | "secrecy" | "companyAlert" | "careerPressure";
export interface StatPreview { id: StatId; label: string; value: number; unit?: string }
export interface StoryChoice { id: "A" | "B" | "C"; text: string }
export interface MockStory {
  title: string;
  time: string;
  sourceLabel: string;
  subtitle: string;
  paragraphs: string[];
  choices: StoryChoice[];
}
export interface ActionReceipt { label: string; response: string }
