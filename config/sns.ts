import type { EventTag } from "../types/event";
import type { SNSAccountType, SNSOpinionLevel, SNSPostTag, SNSTriggerReason } from "../types/sns";
import type { StateEffects } from "../types/state";

export const SNS_PROMPT_VERSION = "sns-v1" as const;

export const SNS_POLICY = {
  maxPostsPerTrigger: 4,
  maxPostLength: 320,
  recentPostLimit: 8,
  importantMemoryMinimumLevel: "rumor" as SNSOpinionLevel,
} as const;

export const SNS_LEVEL_ORDER: Record<SNSOpinionLevel, number> = {
  normal: 0,
  attention: 1,
  rumor: 2,
  controversy: 3,
  crisis: 4,
};

export const SNS_LEVEL_EFFECTS: Record<SNSOpinionLevel, StateEffects> = {
  normal: {},
  attention: { popularity: "small_positive", companyAlert: "small_positive" },
  rumor: { popularity: "small_positive", secrecy: "small_negative", companyAlert: "small_positive", mood: "small_negative" },
  controversy: { popularity: "small_negative", secrecy: "medium_negative", companyAlert: "medium_positive", mood: "medium_negative", careerPressure: "small_positive" },
  crisis: { popularity: "medium_negative", secrecy: "large_negative", companyAlert: "large_positive", mood: "medium_negative", careerPressure: "medium_positive" },
};

export const SNS_REASON_POLICY: Record<SNSTriggerReason, {
  allowedAccounts: SNSAccountType[];
  defaultTags: SNSPostTag[];
  eventTags: EventTag[];
}> = {
  performance_buzz: { allowedAccounts: ["official", "media", "fansite", "fan"], defaultTags: ["performance", "fandom"], eventTags: ["sns", "media", "performance"] },
  airport_sighting: { allowedAccounts: ["media", "fansite", "fan", "anonymous"], defaultTags: ["airport", "fandom"], eventTags: ["sns", "airport", "media"] },
  fandom_discussion: { allowedAccounts: ["fansite", "fan", "anonymous", "media"], defaultTags: ["fandom"], eventTags: ["sns", "fandom"] },
  company_statement: { allowedAccounts: ["company", "official", "media"], defaultTags: ["company", "official"], eventTags: ["sns", "company-intervention", "media"] },
  relationship_rumor: { allowedAccounts: ["media", "fansite", "fan", "anonymous"], defaultTags: ["relationship_rumor", "privacy"], eventTags: ["sns", "fandom", "privacy", "high-risk"] },
  exposure_leak: { allowedAccounts: ["media", "fan", "anonymous"], defaultTags: ["exposure", "privacy"], eventTags: ["sns", "media", "privacy", "high-risk"] },
  paparazzi_exposure: { allowedAccounts: ["media", "anonymous"], defaultTags: ["exposure", "privacy"], eventTags: ["sns", "paparazzi", "media", "privacy", "high-risk"] },
  popularity_spike: { allowedAccounts: ["official", "media", "fan", "fansite"], defaultTags: ["career", "fandom"], eventTags: ["sns", "fandom", "media"] },
};

export const snsDebugFixtures = [
  { id: "airport", label: "Airport attention", reason: "airport_sighting", level: "attention", title: "机场公开行程", summary: "公开行程中出现值得讨论的机场画面。", category: "publicOpinion", tags: ["airport", "media"] },
  { id: "exposure", label: "Exposure crisis", reason: "exposure_leak", level: "crisis", title: "偷拍视频传播", summary: "一段公开可见的偷拍视频正在网络上传播。", category: "crisis", tags: ["paparazzi", "media", "privacy", "high-risk"] },
] as const;
