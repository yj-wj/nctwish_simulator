import { SNS_LEVEL_ORDER, snsDebugFixtures } from "../config/sns.ts";
import type { EventCategory, EventTag } from "../types/event";
import type { GameState } from "../types/game";
import type { OutcomeTag } from "../types/history";
import type { SNSGenerationTrigger, SNSOpinionLevel, SNSTriggerReason } from "../types/sns";

const publicTags = new Set<EventTag>(["airport", "concert", "fan-sign", "fandom", "high-risk", "live", "media", "music-show", "paparazzi", "performance", "privacy", "sns"]);

export interface SNSStructuredSource {
  gameId: string;
  week: number;
  sourceTurnId: string;
  sourceEventId?: string;
  sourceCategory: EventCategory;
  sourceTags: EventTag[];
  publicTitle: string;
  publicSummary: string;
  outcomeTags: OutcomeTag[];
  beforeState: GameState;
  afterState: GameState;
}

function levelAtLeast(left: SNSOpinionLevel, right: SNSOpinionLevel): SNSOpinionLevel {
  return SNS_LEVEL_ORDER[left] >= SNS_LEVEL_ORDER[right] ? left : right;
}

function reasonAndLevel(source: SNSStructuredSource): { reason: SNSTriggerReason; level: SNSOpinionLevel } | null {
  const tags = new Set(source.sourceTags);
  const hasPublicEvidence = source.sourceTags.some((tag) => publicTags.has(tag));
  const secrecyDrop = source.afterState.stats.secrecy < source.beforeState.stats.secrecy;
  const popularityGain = source.afterState.stats.popularity - source.beforeState.stats.popularity;
  const majorExposure = source.outcomeTags.includes("major_exposure");
  if (majorExposure) return { reason: tags.has("paparazzi") ? "paparazzi_exposure" : "exposure_leak", level: "crisis" };
  if (!hasPublicEvidence && popularityGain < 5) return null;
  if (tags.has("paparazzi")) return { reason: "paparazzi_exposure", level: source.afterState.stats.secrecy < 30 ? "crisis" : "controversy" };
  if (source.sourceCategory === "company" || tags.has("company-intervention")) return { reason: "company_statement", level: tags.has("high-risk") ? "controversy" : "attention" };
  if (secrecyDrop || (tags.has("privacy") && tags.has("high-risk"))) {
    return { reason: "relationship_rumor", level: source.afterState.stats.secrecy < 30 ? "controversy" : "rumor" };
  }
  if (tags.has("airport")) return { reason: "airport_sighting", level: tags.has("high-risk") ? "rumor" : "attention" };
  if (["career", "entertainment"].includes(source.sourceCategory) && ["concert", "fan-sign", "live", "music-show", "performance"].some((tag) => tags.has(tag as EventTag))) {
    return { reason: "performance_buzz", level: "attention" };
  }
  if (source.sourceCategory === "publicOpinion" || tags.has("fandom") || tags.has("sns")) {
    let level: SNSOpinionLevel = tags.has("high-risk") ? "rumor" : "attention";
    if (source.afterState.stats.companyAlert > 80) level = levelAtLeast(level, "controversy");
    return { reason: "fandom_discussion", level };
  }
  if (popularityGain >= 5) return { reason: "popularity_spike", level: "attention" };
  return null;
}

export function deriveSNSTrigger(source: SNSStructuredSource): SNSGenerationTrigger | null {
  const match = reasonAndLevel(source);
  if (!match) return null;
  return {
    id: `sns:${source.sourceTurnId}:${match.reason}`,
    reason: match.reason,
    level: match.level,
    week: source.week,
    sourceEventId: source.sourceEventId,
    sourceTurnId: source.sourceTurnId,
    sourceCategory: source.sourceCategory,
    sourceTags: [...source.sourceTags],
    publicTitle: source.publicTitle,
    publicSummary: source.publicSummary,
    status: "pending",
  };
}

export function appendSNSTrigger(triggers: SNSGenerationTrigger[], trigger: SNSGenerationTrigger | null): SNSGenerationTrigger[] {
  if (!trigger || triggers.some(({ id }) => id === trigger.id)) return triggers;
  return [...triggers, trigger];
}

export function createSNSDebugTrigger(fixtureId: string, gameState: GameState): SNSGenerationTrigger | null {
  const fixture = snsDebugFixtures.find(({ id }) => id === fixtureId);
  if (!fixture) return null;
  return {
    id: `sns:fixture:${gameState.gameId}:${gameState.week}:${fixture.id}`,
    reason: fixture.reason,
    level: fixture.level,
    week: gameState.week,
    sourceEventId: `fixture:${fixture.id}`,
    sourceTurnId: `fixture:${fixture.id}`,
    sourceCategory: fixture.category,
    sourceTags: [...fixture.tags],
    publicTitle: fixture.title,
    publicSummary: fixture.summary,
    status: "pending",
  };
}
