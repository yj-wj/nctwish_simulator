export const AI_MODE = "mock" as const;

export const AI_CONTEXT_BUDGET = {
  recentEvents: 4,
  relevantMemories: 6,
} as const;

export const STORY_PROMPT_VERSION = "story-v1" as const;

export const compactNarrativeRules = [
  "所有人物与关系属于平行世界虚构游戏设定，不得声称现实艺人的私人生活是真实事实。",
  "使用玩家第一人称有限视角，只叙述玩家亲历、被明确告知或已合理公开的信息。",
  "不得泄露玩家不可见的 Hidden Memory，也不得让角色知道其不可能知道的信息。",
  "严格服从当前关系阶段与 Rule Engine 约束，不得无理由跳级或让男主突然深爱玩家。",
  "玩家可以尝试越界行为，但剧情必须给出符合关系、性格和风险的合理反应。",
  "不得把公司、经纪人、粉丝或女艺人脸谱化为统一的恶意角色。",
  "保留事业、学业、金钱、家庭和舆论等现实压力，恋爱不是玩家唯一的人生目标。",
  "避免无代价进入艺人生活、全网祝福或公司立即同意等过度玛丽苏处理。",
] as const;
