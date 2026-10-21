import type {
  EndingContext,
  EndingDefinition,
  EndingDerivedConditionId,
} from "../types/ending";
import { initialStoryFlags } from "./history.ts";

export const endingProgressConfig = {
  weekCheckpoints: [12, 24, 36],
  affectionThreshold: 91,
} as const;

export const endingDerivedConditionConfig = {
  playerLifeStable: { moneyMin: 500, moodMin: 40, selfGrowthEventsInLast8WeeksMin: 2 },
  stillInLove: { affectionMin: 81 },
  maleLeadCareerStable: { careerPressureMax: 60 },
} as const;

export const endingDefinitions: EndingDefinition[] = [
  {
    id: "HE_SECRET_STABLE",
    type: "HE",
    title: "隐秘而稳定的爱",
    allOf: [
      { source: "stat", key: "affection", operator: "greaterThanOrEqual", value: 90, sourceText: "affection >= 90" },
      { source: "stat", key: "secrecy", operator: "greaterThanOrEqual", value: 60, sourceText: "secrecy >= 60" },
      { source: "stat", key: "companyAlert", operator: "lessThanOrEqual", value: 70, sourceText: "companyAlert <= 70" },
      { source: "stat", key: "careerPressure", operator: "lessThanOrEqual", value: 90, sourceText: "careerPressure <= 90" },
      { source: "derived", key: "playerLifeStable", expected: true, sourceText: "playerLifeStable = true" },
      { source: "storyFlag", key: "relationshipConfirmed", expected: true, sourceText: "relationshipConfirmed = true" },
      { source: "storyFlag", key: "formalBreakup", expected: false, sourceText: "formalBreakup = false" },
      { source: "storyFlag", key: "unresolvedMajorCrisis", expected: false, sourceText: "unresolvedMajorCrisis = false" },
    ],
    direction: "没有公开，但拥有真实、稳定、彼此尊重的关系。",
  },
  {
    id: "OE_WAITING",
    type: "OE",
    title: "未公开的等待",
    allOf: [
      { source: "stat", key: "affection", operator: "greaterThanOrEqual", value: 81, sourceText: "affection >= 81" },
      { source: "stat", key: "careerPressure", operator: "greaterThanOrEqual", value: 75, sourceText: "careerPressure >= 75" },
      { source: "stat", key: "companyAlert", operator: "greaterThanOrEqual", value: 70, sourceText: "companyAlert >= 70" },
      { source: "derived", key: "stillInLove", expected: true, sourceText: "stillInLove = true" },
      { source: "storyFlag", key: "separationPressureActive", expected: true, sourceText: "separationPressureActive = true" },
      { source: "storyFlag", key: "formalBreakup", expected: false, sourceText: "formalBreakup = false" },
      { source: "historyFact", key: "waitOrMaintainRelationshipChoiceMade", expected: true, sourceText: "关键事件选择等待、维持关系或暂时保持距离" },
    ],
    direction: "双方仍相爱，但现实条件暂时不允许靠近。",
  },
  {
    id: "BE_EXPOSURE",
    type: "BE",
    title: "曝光后的分离",
    allOf: [
      { source: "stat", key: "secrecy", operator: "lessThan", value: 20, sourceText: "secrecy < 20" },
      { source: "stat", key: "companyAlert", operator: "greaterThan", value: 85, sourceText: "companyAlert > 85" },
      { source: "stat", key: "popularity", operator: "greaterThan", value: 60, sourceText: "popularity > 60" },
      { source: "storyFlag", key: "majorExposureOccurred", expected: true, sourceText: "majorExposureOccurred = true" },
      { source: "storyFlag", key: "publicOpinionOutOfControl", expected: true, sourceText: "publicOpinionOutOfControl = true" },
    ],
    anyOf: [
      { source: "storyFlag", key: "playerChoseSeparation", expected: true, sourceText: "playerChoseSeparation = true" },
      { source: "storyFlag", key: "forcedSeparation", expected: true, sourceText: "forcedSeparation = true" },
      { source: "storyFlag", key: "relationshipFailedDuringExposure", expected: true, sourceText: "relationshipFailedDuringExposure = true" },
    ],
    direction: "恋情曝光后，公司与舆论压力失控，双方最终无法继续维持关系。",
  },
  {
    id: "BE_PLAYER_LEAVES",
    type: "BE",
    title: "你选择离开",
    allOf: [
      { source: "history", key: "lowMoodWeeksInLast5", operator: "greaterThanOrEqual", value: 3, sourceText: "lowMoodWeeksInLast5 >= 3" },
      { source: "history", key: "selfProtectionChoiceCount", operator: "greaterThanOrEqual", value: 3, sourceText: "selfProtectionChoiceCount >= 3" },
      { source: "history", key: "unstableResponseCount", operator: "greaterThanOrEqual", value: 2, sourceText: "unstableResponseCount >= 2" },
      { source: "storyFlag", key: "playerChoseLeave", expected: true, sourceText: "playerChoseLeave = true" },
    ],
    direction: "玩家主动结束关系，并重新选择自己的生活。",
  },
  {
    id: "SE_PUBLIC_RELATIONSHIP",
    type: "SE",
    title: "公开恋爱",
    allOf: [
      { source: "stat", key: "affection", operator: "greaterThanOrEqual", value: 95, sourceText: "affection >= 95" },
      { source: "stat", key: "careerPressure", operator: "lessThanOrEqual", value: 60, sourceText: "careerPressure <= 60" },
      { source: "stat", key: "companyAlert", operator: "lessThanOrEqual", value: 60, sourceText: "companyAlert <= 60" },
      { source: "storyFlag", key: "relationshipConfirmed", expected: true, sourceText: "relationshipConfirmed = true" },
      { source: "derived", key: "maleLeadCareerStable", expected: true, sourceText: "maleLeadCareerStable = true" },
      { source: "storyFlag", key: "publicRevealEventTriggered", expected: true, sourceText: "publicRevealEventTriggered = true" },
      { source: "storyFlag", key: "publicRevealSucceeded", expected: true, sourceText: "publicRevealSucceeded = true" },
      { source: "storyFlag", key: "publicOpinionOutOfControl", expected: false, sourceText: "publicOpinionOutOfControl = false" },
    ],
    anyOf: [
      { source: "stat", key: "popularity", operator: "greaterThanOrEqual", value: 60, sourceText: "popularity >= 60" },
      { source: "storyFlag", key: "playerCareerStable", expected: true, sourceText: "playerCareerStable = true" },
    ],
    direction: "双方成功通过高难度公开事件，公司最终承认关系。",
  },
];

export const initialEndingContext: EndingContext = {
  historyMetrics: {
    selfGrowthEventsInLast8Weeks: 0,
    selfProtectionChoiceCount: 0,
    unstableResponseCount: 0,
    lowMoodWeeksInLast5: 0,
  },
  storyFlags: { ...initialStoryFlags },
  historyFacts: {
    unresolvedFinancialCrisis: false,
    waitOrMaintainRelationshipChoiceMade: false,
    unresolvedCareerBreakdownInLast4Weeks: false,
  },
};

export const endingDerivedConditionLabels: Record<EndingDerivedConditionId, string> = {
  playerLifeStable: "playerLifeStable",
  stillInLove: "stillInLove",
  maleLeadCareerStable: "maleLeadCareerStable",
};
