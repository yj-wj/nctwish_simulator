import { getCharacter } from "./characters/index.ts";
import type { CharacterId } from "../types/character";
import type { NPCDefinition, NPCId, NPCState, WorldActorDefinition } from "../types/npc";

export const npcRegistry: NPCDefinition[] = [
  {
    id: "npc:friend", name: "室友", role: "bestFriendOrRoommate", roleLabel: "朋友 / 室友",
    personality: ["重视现实生活", "愿意提供情绪支持", "必要时会直接反对玩家的选择"],
    relationshipToPlayer: "最接近玩家日常生活的人之一", knowledgeScope: ["player_private"],
    tags: ["friend", "daily-life", "support"], enabled: true,
    publicDescription: "熟悉你的生活节奏，会关心也会劝阻你。",
    narrativeConstraints: ["可以与玩家争执，不能只作为无条件赞同工具。"],
  },
  {
    id: "npc:fandom-friend", name: "追星搭子", role: "fanFriend", roleLabel: "粉圈朋友",
    personality: ["熟悉粉圈视角", "关注公开行程和讨论", "发现异常后会有自己的判断"],
    relationshipToPlayer: "与你分享追星资讯的朋友", knowledgeScope: ["fandom_public", "fandom_private"],
    tags: ["fandom", "public-opinion"], enabled: true,
    publicDescription: "与你交换公开行程和粉圈消息。",
    narrativeConstraints: ["发现关系风险不等于自动恶意曝光。"],
  },
  {
    id: "npc:childhood-friend", name: "青梅竹马", role: "childhoodFriendOrRival", roleLabel: "青梅竹马 / 对照者",
    personality: ["提供普通生活的稳定对照", "有独立边界", "不会围绕恋爱线失去自我"],
    relationshipToPlayer: "熟悉玩家过去生活的旧友", knowledgeScope: ["player_private"],
    tags: ["friend", "ordinary-life", "rival"], enabled: true,
    publicDescription: "认识过去的你，也代表另一种稳定生活。",
    narrativeConstraints: ["不能被写成推进主恋爱线的单纯工具。"],
  },
  {
    id: "npc:mother", name: "妈妈", role: "mother", roleLabel: "母亲",
    personality: ["关心生活稳定", "在意学业、收入与未来", "对娱乐行业理解有限"],
    relationshipToPlayer: "玩家的母亲", knowledgeScope: ["family_private", "player_private"],
    tags: ["family", "reality"], enabled: true,
    publicDescription: "关心你的安全、生活与长期选择。",
    narrativeConstraints: ["建议回归稳定生活不等于否定玩家。"],
  },
  {
    id: "npc:father", name: "爸爸", role: "father", roleLabel: "父亲",
    personality: ["表达相对安静", "关注安全和未来", "判断可以与母亲不同"],
    relationshipToPlayer: "玩家的父亲", knowledgeScope: ["family_private", "player_private"],
    tags: ["family", "reality"], enabled: true,
    publicDescription: "较少直接干预，但会关注风险和后路。",
    narrativeConstraints: ["不能复制母亲的反应；需要保留独立立场。"],
  },
  {
    id: "npc:manager", name: "经纪人", role: "manager", roleLabel: "男主经纪人",
    personality: ["风险敏感", "熟悉公司、合约与资源", "优先考虑艺人事业"],
    relationshipToPlayer: "通过男主工作关系认识玩家", knowledgeScope: ["company_internal", "industry_public"],
    tags: ["company", "career", "risk"], enabled: true,
    publicDescription: "负责行程和风险控制的工作人员。",
    narrativeConstraints: ["事业优先，但不能被扁平化成反派。"],
  },
  {
    id: "npc:industry-rival", name: "合作女艺人", role: "industryRival", roleLabel: "同行 / 合作者",
    personality: ["有自己的事业目标", "承受行业压力", "可能有宣传合作需求"],
    relationshipToPlayer: "因行业活动与男主或玩家产生交集", knowledgeScope: ["industry_public"],
    tags: ["industry", "career", "collaboration"], enabled: true,
    publicDescription: "与男主存在公开工作合作的同行。",
    narrativeConstraints: ["不能套用恶毒女配刻板印象。"],
  },
  {
    id: "npc:fandom-key-person", name: "粉圈关键人物", role: "fandomKeyPerson", roleLabel: "粉圈关键人物",
    personality: ["能够放大公开信息", "有独立立场", "身份可能是大粉、站姐或讨论组织者"],
    relationshipToPlayer: "尚未必直接认识玩家", knowledgeScope: ["fandom_public", "fandom_private"],
    tags: ["fandom", "sns", "public-opinion"], enabled: true,
    publicDescription: "在粉圈信息传播中具有影响力的账号或人物。",
    narrativeConstraints: ["大粉、站姐、私生、搬运号与黑粉不能被当成同一种身份。"],
  },
];

const byId = new Map(npcRegistry.map((npc) => [npc.id, npc]));
export function getNPC(id: NPCId): NPCDefinition { const npc = byId.get(id); if (!npc) throw new Error(`Unknown NPC: ${id}`); return npc; }

export function createInitialNPCStates(): NPCState[] {
  return npcRegistry.map((npc) => ({
    npcId: npc.id,
    known: ["npc:friend", "npc:mother", "npc:father"].includes(npc.id),
    active: npc.id === "npc:friend",
    relationship: { trust: npc.id === "npc:friend" ? 65 : 40, closeness: npc.id === "npc:friend" ? 60 : 30, tension: 10 },
    knownBy: npc.id === "npc:fandom-key-person" ? [] : ["player"],
  }));
}

/** Unified actor registry view: the selected male lead plus the eight GAME_SPEC NPC slots. */
export function getWorldActorRegistry(maleLeadId: CharacterId): WorldActorDefinition[] {
  const lead = getCharacter(maleLeadId);
  return [{
    id: lead.id, name: lead.name, role: "currentMaleLead", personality: [...lead.traits],
    relationshipToPlayer: "当前可攻略男主", knowledgeScope: ["shared"],
    tags: [...lead.tags], enabled: true,
  }, ...npcRegistry];
}
