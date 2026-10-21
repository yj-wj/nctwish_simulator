import type { Character } from "@/types/character";
import { sharedCharacterNarrativeConstraints } from "./shared.ts";

export const riku: Character = {
  id: "riku",
  name: "前田陆",
  displayName: "Riku",
  subtitle: "黑色猫咪的易碎感日系男",
  groupName: "NCT WISH",
  isAdult: true,
  tags: ["巨蟹座", "氛围感色情", "库洛米", "情感黑洞", "易碎感"],
  publicPersona: "他有着水象巨蟹座极其细腻、感性的一面，完全不带直男的粗粝感，甚至像小女孩一样有着丰富且多变的愁绪。舞台上是 All Black、Bape 迷彩的拽哥，私下却有一种审美极好的“网黄感”，举手投足间透着一种莫名其妙的色气。",
  privatePersona: "他身上有一种令女生着迷的“委靡感”——颓废、敏感、随时可能破碎。这种性格在恋爱中极具吸引力，但也伴随着冷暴力的风险。他像只黑色的猫，当你试图彻底占有他时，他会因为情绪的潮汐而缩回壳里。他能共情你的痛苦，但也意味着他比你更需要被包裹和保护。",
  traits: [
    "舞台上的 All Black、Bape 迷彩与私下细腻多变形成反差。",
    "情绪变化时退缩、需要被保护属于原文真实侧面。",
    "审美共鸣引发“灵魂伴侣”的错觉是桥段参考，不是直接确立关系。",
  ],
  romanceTriggers: [
    {
      id: "rainy-night-escape",
      title: "阴郁雨天的私奔",
      description: "适合深夜在狭窄的保姆车里，或者下雨天在昏暗的公寓里。那种极致的感性时刻，他会抱着库洛咪跟你聊一些虚无缥缈的人生，这种时刻最容易触发“易碎感”的好感暴击。",
      classification: "Example",
    },
    {
      id: "aesthetic-resonance",
      title: "审美共鸣",
      description: "陪他去买衣服或看画展，如果你能精准点评出他那身 All Black 穿搭的微妙之处，他会对你产生一种“灵魂伴侣”的错觉。",
      classification: "Example",
    },
  ],
  romanceTaboos: [
    { id: "forcedSocializing", title: "强制社交 / 直男发言", description: "极度反感你用那种“大喇喇”的直男逻辑去拆穿他的小心思，或者强迫他去参加他不喜欢的聚会。" },
    { id: "dismissEmotions", title: "过度正能量", description: "在他 emo 时，千万不要说“这有什么大不了的”，这会让他觉得你完全无法共情他的“破碎”。" },
  ],
  preferredEventTypes: ["relationship", "daily"],
  narrativeConstraints: [
    ...sharedCharacterNarrativeConstraints,
    "不能把“好感暴击”解释成固定数值增量或倍率。",
    "不得把敏感、退缩或冷暴力风险删去，只留下氛围感。",
  ],
  visual: { motif: "BLACK CAT", color: "lavender", monogram: "R", alt: "Riku 字母视觉占位，非人物肖像" },
  sourceNotes: ["原文标签使用“库洛米”，雨天桥段使用“库洛咪”，两种写法按各自原文保留。"],
};

