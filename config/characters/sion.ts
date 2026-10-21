import type { Character } from "@/types/character";
import { sharedCharacterNarrativeConstraints } from "./shared.ts";

export const sion: Character = {
  id: "sion",
  name: "吴是温",
  displayName: "Sion",
  subtitle: "郁金香式的克制领袖",
  groupName: "NCT WISH",
  isAdult: true,
  tags: ["全能欧巴", "掌控欲", "狐兔双相"],
  publicPersona: "作为团队的定海神针，他是那种典型的、极具安全感的土象金牛男。生活里是无微不至的“欧巴”，关键时刻总能扛起大旗。他长了一张狐狸与兔子兼具的脸，像郁金香一样矜贵。",
  privatePersona: null,
  traits: [
    "作为团队的定海神针，在关键时刻承担责任。",
    "照顾与被照顾的反差、疲惫时卸下包袱来自推荐桥段，不能泛化为陌生阶段必然撒娇。",
  ],
  romanceTriggers: [
    {
      id: "workplace-push-pull",
      title: "职场上位 / 私下推拉",
      description: "作为队长，他非常适合那种“职场潜规则”边缘的剧情。比如在公司会议室，他一边严肃地和你谈论宣传方案，一边在桌子下面用手指轻轻划过你的手背。",
      classification: "Example",
    },
    {
      id: "care-role-reversal",
      title: "照顾与被照顾的反差",
      description: "在他生病或极度疲惫时，看他卸下“欧巴”的包袱，像只撒娇的兔子一样赖在你怀里，但清醒后又会迅速变回那个掌控一切的狐狸。",
      classification: "Example",
    },
  ],
  romanceTaboos: [
    { id: "challengeAuthority", title: "挑战权威", description: "极度反感在公开场合（尤其是在队友面前）不给他面子。" },
    { id: "deception", title: "失信与欺骗", description: "他能包容你的笨，但绝不接受你的骗。一旦发现你对他有隐瞒，他会瞬间收回所有的温柔。" },
  ],
  preferredEventTypes: ["career", "relationship"],
  narrativeConstraints: [
    ...sharedCharacterNarrativeConstraints,
    "原文没有单独的“真实侧面”段落，privatePersona 不得凭空补写。",
    "疲惫或生病时的反差是 Example，不是每局必发事件。",
  ],
  visual: { motif: "TULIP", color: "sage", monogram: "S", alt: "Sion 字母视觉占位，非人物肖像" },
  sourceNotes: ["原文未为 Sion 单设“真实侧面”段落。"],
};

