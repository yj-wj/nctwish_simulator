import type { EventCategory } from "./event";

export type CharacterId = "sion" | "riku" | "yushi" | "jaehee" | "ryo" | "sakuya";

export type CharacterBoundaryId =
  | "challengeAuthority"
  | "deception"
  | "forcedSocializing"
  | "dismissEmotions"
  | "excessiveMonitoring"
  | "forcedFanservice"
  | "neglectOrComparison"
  | "prematureFuturePressure"
  | "manipulation"
  | "infantilization"
  | "unfaithfulness";

export interface CharacterVisual {
  motif: string;
  color: "sage" | "lavender" | "blue" | "peach" | "butter" | "rose";
  monogram: string;
  alt: string;
}

export interface CharacterNarrativeExample {
  id: string;
  title: string;
  description: string;
  classification: "Example";
}

export interface RomanceTaboo {
  id: CharacterBoundaryId;
  title: string;
  description: string;
  explicitEffect?: string;
}

export interface Character {
  id: CharacterId;
  name: string;
  displayName: string;
  subtitle: string;
  groupName: "NCT WISH";
  isAdult: true;
  tags: string[];
  publicPersona: string;
  privatePersona: string | null;
  traits: string[];
  romanceTriggers: CharacterNarrativeExample[];
  romanceTaboos: RomanceTaboo[];
  preferredEventTypes: EventCategory[];
  narrativeConstraints: string[];
  visual: CharacterVisual;
  sourceNotes?: string[];
}

