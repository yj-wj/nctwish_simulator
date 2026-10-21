import type { Character } from "@/types/character";
import { sharedCharacterNarrativeConstraints } from "./shared.ts";

export const sakuya: Character = {
  id: "sakuya",
  name: "藤永咲哉",
  displayName: "Sakuya",
  subtitle: "萌脸狼的阴湿推拉",
  groupName: "NCT WISH",
  isAdult: true,
  tags: ["天蝎座", "萌脸狼", "极强占有欲", "馒头皮", "禁忌感"],
  publicPersona: "长着一张人畜无害的萌脸，皮肤像刚出锅的小馒头一样白嫩。但作为天蝎男，他是个顶级的推拉大师，边界感极强。他正处于一种正太与男人兼具的微妙平衡期，清纯中透着一股狠劲。",
  privatePersona: "他的欲望和占有欲是极强的，甚至带着一种天蝎特有的“阴湿”气质。他很臭屁，非常享受玩弄人心的感觉，恋爱体验感极强却充满危险。他会让你觉得他是需要被照顾的弟弟，但在只有两个人的房间里，他散发出的侵略性会让你瞬间意识到，他是一只随时准备拆解猎物的幼狼。",
  traits: [
    "外表温软与强占有欲、推拉、边界感、臭屁、侵略性构成反差。",
    "追求对等甚至带有对抗性的恋爱，不接受被持续婴儿化。",
  ],
  romanceTriggers: [
    {
      id: "dangerous-push-pull",
      title: "危险的推拉游戏",
      description: "适合那种“禁忌感”拉满的剧情。比如在休息室的暗处，他一边吃着馒头一样软糯的零食，一边用那种充满占有欲的眼神盯着你，说一些完全不符合他萌脸的、充满攻击性的情话。",
      classification: "Example",
    },
    {
      id: "younger-to-man",
      title: "从弟弟到男人的跨越",
      description: "在某个瞬间（比如换装后），让你意识到他已经不再是那个“正太”，而是拥有极强欲望的天蝎男。",
      classification: "Example",
    },
  ],
  romanceTaboos: [
    { id: "infantilization", title: "母性泛滥", description: "绝对不要一直把他当成“小宝宝”来对待。他想要的是对等的、甚至带有对抗性的恋爱，过度的母爱会让他觉得索然无味。" },
    { id: "unfaithfulness", title: "不忠 / 不专一", description: "一旦发现你和其他男主有暧昧，他会立刻开启“阴湿”模式，让你的游戏心情值直接清零。", explicitEffect: "mood = 0" },
  ],
  preferredEventTypes: ["relationship", "crisis"],
  narrativeConstraints: [
    ...sharedCharacterNarrativeConstraints,
    "原文“正太”“幼狼”仅作为年龄感和动物化措辞，所有亲密关系角色必须成年。",
    "mood = 0 的发现条件、暧昧判定、适用阶段和结算顺序尚未定义，Phase 2 不执行此效果。",
  ],
  visual: { motif: "MOONLIGHT", color: "rose", monogram: "S", alt: "Sakuya 字母视觉占位，非人物肖像" },
};

