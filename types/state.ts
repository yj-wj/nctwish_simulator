import type { GameState, GameStats, RelationshipStageId, StatId } from "./game";
import type { RuleEvaluation } from "./rules";

export type EffectMagnitude =
  | "large_negative"
  | "medium_negative"
  | "small_negative"
  | "none"
  | "small_positive"
  | "medium_positive"
  | "large_positive";

export type StateEffects = Partial<Record<StatId, EffectMagnitude>>;

export interface StateEffectContext {
  eventId: string;
  choiceId: string;
  ruleEvaluation?: RuleEvaluation;
}

export interface ResolvedStatEffect {
  stat: StatId;
  magnitude: EffectMagnitude;
  baseDelta: number;
  modifier: number;
  appliedDelta: number;
  before: number;
  after: number;
}

export type StateModifierCode =
  | "characterBoundaryNegativeAffection"
  | "sakuyaUnfaithfulnessMoodReset";

export interface StateChangeLogEntry {
  week: number;
  eventId: string;
  choiceId: string;
  before: GameStats;
  effects: StateEffects;
  resolvedEffects: ResolvedStatEffect[];
  modifiers: StateModifierCode[];
  after: GameStats;
  relationshipStageBefore: RelationshipStageId;
  relationshipStageAfter: RelationshipStageId;
}

export interface StateEngineResult {
  gameState: GameState;
  changeLog: StateChangeLogEntry;
}

export interface DebugStatePatch {
  week?: number;
  stats?: Partial<GameStats>;
}

