import type { EventCategory, EventTag } from "../types/event";
import type { CareerStage, GameModeId, RelationshipStageId } from "../types/game";
import type { SpecialTriggerId } from "../types/rules";

type CategoryWeights = Record<EventCategory, number>;

// GAME_SPEC defines the direction of these biases but leaves their numeric values
// open. Phase 3B keeps every implementation value here so the engine is explainable.
export const gameModeEventWeights: Record<GameModeId, CategoryWeights> = {
  slow: {
    daily: 1.4,
    relationship: 0.72,
    career: 1.3,
    publicOpinion: 0.82,
    company: 0.82,
    reality: 1.35,
    entertainment: 1,
    crisis: 0.68,
  },
  standard: {
    daily: 1,
    relationship: 1.15,
    career: 1,
    publicOpinion: 1,
    company: 1,
    reality: 1,
    entertainment: 1,
    crisis: 1,
  },
  pressure: {
    daily: 0.8,
    relationship: 0.9,
    career: 1,
    publicOpinion: 1.55,
    company: 1.55,
    reality: 1,
    entertainment: 1.15,
    crisis: 1.75,
  },
  healing: {
    daily: 1.55,
    relationship: 1.4,
    career: 0.88,
    publicOpinion: 0.72,
    company: 0.68,
    reality: 1.1,
    entertainment: 0.9,
    crisis: 0.55,
  },
};

export const relationshipStageEventWeights: Record<RelationshipStageId, CategoryWeights> = {
  strangers: {
    daily: 1.45,
    relationship: 0.62,
    career: 1.25,
    publicOpinion: 0.42,
    company: 0.35,
    reality: 1.25,
    entertainment: 1,
    crisis: 0.45,
  },
  noticed: {
    daily: 1.3,
    relationship: 0.82,
    career: 1.18,
    publicOpinion: 0.55,
    company: 0.5,
    reality: 1.15,
    entertainment: 1,
    crisis: 0.55,
  },
  interested: {
    daily: 1.15,
    relationship: 1.18,
    career: 1.08,
    publicOpinion: 0.7,
    company: 0.65,
    reality: 1.05,
    entertainment: 1,
    crisis: 0.68,
  },
  ambiguous: {
    daily: 1,
    relationship: 1.55,
    career: 1,
    publicOpinion: 0.85,
    company: 0.9,
    reality: 1,
    entertainment: 1,
    crisis: 0.85,
  },
  committed: {
    daily: 0.92,
    relationship: 1.38,
    career: 1,
    publicOpinion: 1.25,
    company: 1.3,
    reality: 1,
    entertainment: 1,
    crisis: 1.22,
  },
  inLove: {
    daily: 0.88,
    relationship: 1.3,
    career: 1,
    publicOpinion: 1.5,
    company: 1.5,
    reality: 1,
    entertainment: 1,
    crisis: 1.6,
  },
  trial: {
    daily: 0.82,
    relationship: 1.2,
    career: 1,
    publicOpinion: 1.55,
    company: 1.65,
    reality: 1.05,
    entertainment: 1,
    crisis: 1.8,
  },
};

export const triggerCategoryEventWeights: Record<SpecialTriggerId, Partial<CategoryWeights>> = {
  emotional_breakdown: { daily: 1.25, reality: 1.6, crisis: 2.4 },
  exposure_crisis: { publicOpinion: 2.2, company: 1.9, crisis: 2.7 },
  player_recognized: { daily: 1.2, publicOpinion: 2.25, company: 1.35, crisis: 1.65 },
  financial_crisis: { career: 1.2, reality: 2.8, crisis: 1.45 },
  company_intervention: { career: 1.2, company: 3, crisis: 1.7 },
  career_breakdown: { relationship: 1.2, career: 2.35, publicOpinion: 1.25, crisis: 2.5 },
};

export const careerStageTagWeights: Record<CareerStage, Partial<Record<EventTag, number>>> = {
  回归期: { comeback: 1.45, album: 1.35, "music-show": 1.35, mv: 1.3, live: 1.2 },
  巡演期: { tour: 1.5, concert: 1.4, travel: 1.25, airport: 1.2, "long-distance": 1.25 },
  个人活动期: { live: 1.15, sns: 1.15, media: 1.1 },
  拍摄期: { mv: 1.4, backstage: 1.2, "work-contact": 1.2 },
  休整期: { "daily-life": 1.35, emotional: 1.15 },
};

export const eventWeightPolicy = {
  requiredTriggerMatch: 1.8,
  explicitlyMatchedCareerStage: 1.2,
  recentWindow: 2,
  recentEventPenalty: 0.28,
} as const;
