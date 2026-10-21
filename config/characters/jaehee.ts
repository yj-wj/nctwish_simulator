import type { Character } from "@/types/character";
import { sharedCharacterNarrativeConstraints } from "./shared.ts";

export const jaehee: Character = {
  id: "jaehee",
  name: "金栽熙",
  displayName: "Jaehee",
  subtitle: "朴实外壳下的双子歌者",
  groupName: "NCT WISH",
  isAdult: true,
  tags: ["双子座", "团队最高", "狗塑", "幽默", "村干部感"],
  publicPersona: "拥有全团最高的海拔，性格却像大狗狗一样朴实，被粉丝戏称为“村干部”。作为双子座，他非常聪明且有趣，歌声中带着能抚平焦虑的力量。",
  privatePersona: "“朴实”是他的伪装，也是他的修养。双子座的他其实看问题非常透彻，在有趣的互动下隐藏着一颗审视的内心。他太想让大家开心了，这种博爱有时会让唯一的伴侣感到自己并不特殊。他能提供稳定的情绪价值，但你很难真正走进他那个充满变数的双子座内心深处。",
  traits: [
    "朴实幽默与透彻审视并存。",
    "希望大家开心的博爱可能让伴侣感到不特殊；提供稳定情绪价值不等于容易被真正理解。",
    "练习时间短带来的焦虑属于推荐桥段中的情境。",
  ],
  romanceTriggers: [
    {
      id: "ordinary-daily-life",
      title: "烟火气的日常",
      description: "适合那种在路边摊吃辣炒年糕，或者在练习室休息时一起听歌的剧情。这种“村干部”式的朴实和双子座的机智结合，会让你觉得很放松。",
      classification: "Example",
    },
    {
      id: "emotional-compensation",
      title: "情感补偿",
      description: "在他因为觉得自己练习时间短而焦虑时，给他最坚定的认可。",
      classification: "Example",
    },
  ],
  romanceTaboos: [
    { id: "neglectOrComparison", title: "被冷落 / 被比较", description: "极度反感你当着他的面夸奖别的主唱，或者在聊天时对他表现出敷衍。" },
    { id: "prematureFuturePressure", title: "沉重的话题", description: "他喜欢轻松的氛围，过早地谈论责任、未来这种沉重话题会让他感到压力过大。" },
  ],
  preferredEventTypes: ["daily", "relationship", "career"],
  narrativeConstraints: [
    ...sharedCharacterNarrativeConstraints,
    "不能只留下稳定情绪价值，而删除审视、博爱带来的不特殊感和内心变数。",
  ],
  visual: { motif: "MELODY", color: "peach", monogram: "J", alt: "Jaehee 字母视觉占位，非人物肖像" },
};

