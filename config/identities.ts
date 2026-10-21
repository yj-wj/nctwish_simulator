import type { PlayerIdentity } from "@/types/player";

export const identityConfig: PlayerIdentity[] = [
  {
    id: "student",
    name: "留学生",
    description: "你在首尔读书，与娱乐圈无关。",
    advantages: ["生活轨迹自然，真实感强。"],
    risks: ["经济压力大，签证、学业、兼职都可能成为剧情压力源。"],
  },
  {
    id: "fan",
    name: "花园丝 / 海外粉丝",
    description: "你曾默默关注 NCT WISH 很久。",
    advantages: ["了解男主的舞台、习惯、组合历史与粉圈规则。"],
    risks: ["身份极其敏感，一旦曝光会被放大审判。"],
  },
  {
    id: "intern",
    name: "娱乐公司实习生",
    description: "你在经纪公司、宣传组、海外业务组、内容组或艺人管理部门实习。",
    advantages: ["接触机会多，能看见男主台下真实状态。"],
    risks: ["职场禁忌，公司明令禁止与艺人私下发展关系。"],
  },
  {
    id: "staff",
    name: "音乐节目工作人员",
    description: "你在打歌节目、年末舞台、颁奖礼或综艺棚工作。",
    advantages: ["能频繁遇见男主，接触韩娱现场生态。"],
    risks: ["项目结束后关系容易断联，职场流言风险高。"],
  },
  {
    id: "stylist",
    name: "妆造师 / 发型助理",
    description: "你参与舞台妆造、杂志拍摄、MV 拍摄或巡演妆发。",
    advantages: ["近距离接触，有独立职业价值。"],
    risks: ["专业边界强，任何暧昧都可能被认定为失职。"],
  },
  {
    id: "translator",
    name: "翻译 / 海外商务助理",
    description: "你负责采访翻译、海外粉丝沟通、品牌活动或巡演随行。",
    advantages: ["能进入男主工作半径，参与关键事件。"],
    risks: ["容易被公司、团队、粉丝同时审视。"],
  },
  {
    id: "part-time",
    name: "咖啡店 / 便利店 / 花店兼职生",
    description: "你是普通人，在首尔生活，为生计奔波。",
    advantages: ["初遇自然，有强烈现实感。"],
    risks: ["阶层落差明显，很难主动靠近他的世界。"],
  },
  {
    id: "custom",
    name: "自定义身份",
    description: "由玩家自行设定初遇契机，后续叙事需合理嵌入韩娱背景。",
    advantages: [],
    risks: [],
  },
];

export function getPlayerIdentity(id: PlayerIdentity["id"]): PlayerIdentity {
  return identityConfig.find((identity) => identity.id === id) ?? identityConfig[0];
}

