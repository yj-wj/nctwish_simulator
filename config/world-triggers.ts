import type { NPCId } from "../types/npc";
import type { WorldEffectTarget, WorldTriggerType } from "../types/world";
import type { StoryFlagEffect } from "../types/history";
import type { StateEffects } from "../types/state";

export interface WorldTriggerPolicy {
  actorIds: NPCId[];
  targets: WorldEffectTarget[];
  storyEventIds: string[];
  summary: string;
  flagEffects: StoryFlagEffect[];
  /** Guidance for a future formal settlement; World Engine never applies these directly. */
  stateEffects: StateEffects;
}

export const worldTriggerPolicy: Record<WorldTriggerType, WorldTriggerPolicy> = {
  relationship_confirmed: {
    actorIds: [], targets: ["chat", "memory"], storyEventIds: ["member_covers_for_lead"],
    summary: "关系已经通过正式结构化结果确认，后续互动需要延续这一事实。",
    flagEffects: [{ flag: "relationshipConfirmed", value: true }], stateEffects: {},
  },
  exposure_started: {
    actorIds: ["npc:manager", "npc:fandom-key-person"], targets: ["story", "chat", "sns", "memory"],
    storyEventIds: ["trigger_exposure_emergency_meeting", "trigger_exposure_fandom_split"],
    summary: "公开线索开始扩散，经纪团队与粉圈会对风险作出反应。",
    flagEffects: [{ flag: "majorExposureOccurred", value: true }], stateEffects: { secrecy: "small_negative", companyAlert: "small_positive" },
  },
  public_opinion_crisis: {
    actorIds: ["npc:manager", "npc:fandom-key-person", "npc:fandom-friend"], targets: ["story", "chat", "sns", "memory"],
    storyEventIds: ["trigger_exposure_emergency_meeting", "fandom_korean_forum_hot_post"],
    summary: "公开讨论已升级为舆论危机，相关人物会采取应对。",
    flagEffects: [{ flag: "publicOpinionOutOfControl", value: true }], stateEffects: { mood: "small_negative", careerPressure: "small_positive" },
  },
  company_intervention: {
    actorIds: ["npc:manager"], targets: ["story", "chat", "memory"],
    storyEventIds: ["trigger_company_formal_manager_talk", "company_manager_interview"],
    summary: "公司或经纪团队已经正式介入。",
    flagEffects: [], stateEffects: { companyAlert: "small_positive", careerPressure: "small_positive" },
  },
  career_breakdown: {
    actorIds: ["npc:manager", "npc:friend"], targets: ["story", "chat", "memory"],
    storyEventIds: ["trigger_career_practice_overwork", "trigger_career_first_vulnerability"],
    summary: "事业压力造成明显失衡，身边人会注意并回应。",
    flagEffects: [{ flag: "unresolvedMajorCrisis", value: true }], stateEffects: { mood: "small_negative" },
  },
  temporary_distance: {
    actorIds: [], targets: ["story", "chat", "memory"], storyEventIds: ["tour_time_difference_distance"],
    summary: "双方进入暂时保持距离的状态，后续交流需保持连续性。",
    flagEffects: [{ flag: "separationPressureActive", value: true }], stateEffects: {},
  },
  major_argument: {
    actorIds: ["npc:friend"], targets: ["story", "memory"], storyEventIds: ["trigger_friend_intervenes"],
    summary: "一次重要冲突已经发生，需要在后续剧情中得到回应。",
    flagEffects: [], stateEffects: { mood: "small_negative" },
  },
  financial_crisis: {
    actorIds: ["npc:friend", "npc:mother", "npc:father"], targets: ["story", "memory"],
    storyEventIds: ["trigger_financial_rent_due", "trigger_financial_visa_tuition"],
    summary: "现实经济压力仍在影响玩家生活。",
    flagEffects: [{ flag: "unresolvedMajorCrisis", value: true }], stateEffects: {},
  },
};

export const worldEventWeightPolicy = {
  pendingStoryEvent: 3,
  activeParticipant: 1.12,
  crisisCategory: 1.35,
  publicOpinionFromSNS: 1.35,
  companyFromWorld: 1.45,
  relationshipFromChat: 1.2,
} as const;
