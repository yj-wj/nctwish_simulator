import type { StoryFlagId, StoryFlagState } from "../types/history";

export const initialStoryFlags: StoryFlagState = {
  relationshipConfirmed: false,
  formalBreakup: false,
  majorExposureOccurred: false,
  publicOpinionOutOfControl: false,
  publicRevealEventTriggered: false,
  publicRevealSucceeded: false,
  unresolvedMajorCrisis: false,
  separationPressureActive: false,
  playerChoseLeave: false,
  playerChoseSeparation: false,
  forcedSeparation: false,
  relationshipFailedDuringExposure: false,
  playerCareerStable: false,
};

export const storyFlagLabels: Record<StoryFlagId, string> = {
  relationshipConfirmed: "双方已完成重要关系确认事件",
  formalBreakup: "双方已正式分手",
  majorExposureOccurred: "已发生重大恋情曝光事件",
  publicOpinionOutOfControl: "重大舆论危机已正式结算为失控",
  publicRevealEventTriggered: "已触发高难度公开恋爱事件",
  publicRevealSucceeded: "公开事件已成功处理公司与舆论压力",
  unresolvedMajorCrisis: "存在尚未解决的重大危机",
  separationPressureActive: "分离压力已正式发生且仍未解决",
  playerChoseLeave: "玩家在最终关系抉择中明确选择离开",
  playerChoseSeparation: "玩家在曝光事件中选择分离",
  forcedSeparation: "曝光事件导致被迫分离",
  relationshipFailedDuringExposure: "曝光事件中未能保护双方关系",
  playerCareerStable: "玩家已完成身份对应的事业稳定事件线",
};

export const historyMetricLabels = {
  selfGrowthEventsInLast8Weeks: "最近 8 周有效成长事件数",
  selfProtectionChoiceCount: "重要关系冲突中的自我保护选择数",
  unstableResponseCount: "重要关系冲突中的不稳定回应数",
  lowMoodWeeksInLast5: "最近 5 次周结算中 mood < 30 的周数",
} as const;
