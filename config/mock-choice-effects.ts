import type { StateEffects } from "../types/state";
import type { StoryChoice } from "../types/ui";

export const mockChoiceEffects: Record<StoryChoice["id"], StateEffects> = {
  A: {
    affection: "small_negative",
    mood: "small_positive",
    secrecy: "small_positive",
    companyAlert: "small_negative",
  },
  B: {
    affection: "medium_positive",
    mood: "small_positive",
    secrecy: "small_negative",
    companyAlert: "small_positive",
  },
  C: {
    mood: "medium_positive",
    money: "small_positive",
    careerPressure: "small_negative",
  },
};

export const mockChoiceLabels: Record<StoryChoice["id"], string> = {
  A: "谨慎处理",
  B: "主动靠近",
  C: "照顾自己的生活",
};
