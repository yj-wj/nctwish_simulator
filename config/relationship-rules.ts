import type { ActionType, RelationshipRuleDefinition } from "../types/rules";

const formalActions: ActionType[] = ["politeConversation", "simpleHelp", "workContact", "other"];
const familiarActions: ActionType[] = [...formalActions, "casualConcern"];
const privateContactActions: ActionType[] = [...familiarActions, "privateMessage", "outsideWorkMeeting"];
const limitedIntimacyActions: ActionType[] = [
  ...privateContactActions,
  "flirt",
  "jealousTest",
  "lateNightContact",
  "confession",
];
const privateRelationshipActions: ActionType[] = [...limitedIntimacyActions, "defineRelationship", "privateIntimacy"];
const majorDecisionActions: ActionType[] = [
  ...privateRelationshipActions,
  "publicRelationship",
  "breakup",
  "wait",
  "selfGrowth",
];

export const relationshipRuleDefinitions: RelationshipRuleDefinition[] = [
  { stageId: "strangers", allowedInteractionLevel: "formal", allowedActionTypes: formalActions },
  { stageId: "noticed", allowedInteractionLevel: "familiar", allowedActionTypes: familiarActions },
  { stageId: "interested", allowedInteractionLevel: "privateContact", allowedActionTypes: privateContactActions },
  { stageId: "ambiguous", allowedInteractionLevel: "limitedIntimacy", allowedActionTypes: limitedIntimacyActions },
  { stageId: "committed", allowedInteractionLevel: "privateRelationship", allowedActionTypes: privateRelationshipActions },
  { stageId: "inLove", allowedInteractionLevel: "intimateRelationship", allowedActionTypes: privateRelationshipActions },
  { stageId: "trial", allowedInteractionLevel: "majorDecision", allowedActionTypes: majorDecisionActions },
];

