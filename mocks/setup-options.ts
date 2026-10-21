import type { FanLevelId, IdentityId, PaceId } from "@/types/ui";

// UI option text from 花园人设版.docx; no identity modifiers or event weights.
export const identities: { id: IdentityId; label: string; description: string; advantage: string; disadvantage: string }[] = [
  { id: "student", label: "留学生", description: "你在首尔读书，与娱乐圈无关。", advantage: "生活轨迹自然，真实感强。", disadvantage: "经济压力大，签证、学业、兼职都可能成为剧情压力源。" },
  { id: "fan", label: "花园丝 / 海外粉丝", description: "你曾默默关注 NCT WISH 很久。", advantage: "了解男主的舞台、习惯、组合历史与粉圈规则。", disadvantage: "身份极其敏感，一旦曝光会被放大审判。" },
  { id: "intern", label: "娱乐公司实习生", description: "你在经纪公司、宣传组、海外业务组、内容组或艺人管理部门实习。", advantage: "接触机会多，能看见男主台下真实状态。", disadvantage: "职场禁忌，公司明令禁止与艺人私下发展关系。" },
  { id: "staff", label: "音乐节目工作人员", description: "你在打歌节目、年末舞台、颁奖礼或综艺棚工作。", advantage: "能频繁遇见男主，接触韩娱现场生态。", disadvantage: "项目结束后关系容易断联，职场流言风险高。" },
  { id: "stylist", label: "妆造师 / 发型助理", description: "你参与舞台妆造、杂志拍摄、MV 拍摄或巡演妆发。", advantage: "近距离接触，有独立职业价值。", disadvantage: "专业边界强，任何暧昧都可能被认定为失职。" },
  { id: "translator", label: "翻译 / 海外商务助理", description: "你负责采访翻译、海外粉丝沟通、品牌活动或巡演随行。", advantage: "能进入男主工作半径，参与关键事件。", disadvantage: "容易被公司、团队、粉丝同时审视。" },
  { id: "part-time", label: "咖啡店 / 便利店 / 花店兼职生", description: "你是普通人，在首尔生活，为生计奔波。", advantage: "初遇自然，有强烈现实感。", disadvantage: "阶层落差明显，很难主动靠近他的世界。" },
  { id: "custom", label: "自定义身份", description: "由你设定身份与初遇契机。", advantage: "保留你自己的生活与故事。", disadvantage: "本阶段仅展示输入；合理嵌入韩娱背景的逻辑留待后续。" },
];

export const fanLevels: { id: FanLevelId; label: string }[] = [
  { id: "longtime", label: "nct老粉" },
  { id: "casual", label: "普通韩娱瓜众" },
  { id: "passerby", label: "纯路人，无感" },
  { id: "returning", label: "曾经脱粉，重新遇见后心情复杂" },
  { id: "single", label: "只喜欢某一位成员，身份更敏感" },
];

export const paces: { id: PaceId; label: string; description: string }[] = [
  { id: "slow", label: "慢热现实向", description: "感情推进缓慢，重细节与拉扯。" },
  { id: "standard", label: "标准韩剧向", description: "甜虐均衡，事业与恋爱并行。" },
  { id: "pressure", label: "高压舆论向", description: "危机较多，公司与粉圈压力更强。" },
  { id: "healing", label: "日常治愈向", description: "甜度较高，但仍保留现实阻碍。" },
];
