export const CHAT_PROMPT_VERSION = "chat-v1" as const;

export const CHAT_POLICY = {
  maxMessageLength: 500,
  recentMessageLimit: 10,
  relevantMemoryLimit: 6,
  maxReplyMessages: 4,
  maxReplyLength: 300,
  maxSuggestedEffects: 3,
  maxMemoryCandidates: 2,
  minimumMemoryImportance: 3,
  relationshipEffectCooldownTurns: 3,
} as const;

export const incomingMessageFixtures = [
  { id: "relationship-follow-up", reason: "relationship_confirmed_follow_up", label: "确认关系后的问候", tags: ["relationship-progress"] },
  { id: "exposure-concern", reason: "exposure_concern", label: "曝光危机后的关心", tags: ["privacy", "media"] },
  { id: "career-check-in", reason: "career_pressure_check_in", label: "事业压力时的问候", tags: ["career", "overwork"] },
] as const;
