import type { SpecialTriggerRule } from "../types/rules";

export const specialTriggerRules: SpecialTriggerRule[] = [
  { id: "emotional_breakdown", stat: "mood", operator: "lessThan", threshold: 20 },
  { id: "exposure_crisis", stat: "secrecy", operator: "lessThan", threshold: 30 },
  { id: "player_recognized", stat: "popularity", operator: "greaterThan", threshold: 60 },
  { id: "financial_crisis", stat: "money", operator: "lessThan", threshold: 500 },
  { id: "company_intervention", stat: "companyAlert", operator: "greaterThan", threshold: 80 },
  { id: "career_breakdown", stat: "careerPressure", operator: "greaterThan", threshold: 90 },
];

