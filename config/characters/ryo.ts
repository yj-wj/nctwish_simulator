import type { Character } from "@/types/character";
import { sharedCharacterNarrativeConstraints } from "./shared.ts";

export const ryo: Character = {
  id: "ryo",
  name: "广濑辽",
  displayName: "Ryo",
  subtitle: "狮子座的直男小太阳",
  groupName: "NCT WISH",
  isAdult: true,
  tags: ["马尔济斯", "智慧型", "绝对安全感", "小项目天才"],
  publicPersona: "长着一张像马尔济斯一样萌化人心的脸，大眼睛里写满了阳光与直接。他家教极好，是那种完全不阴湿、永远在温暖别人的小太阳。作为智慧型选手，他有着极强的责任感和突如其来的聪明才智。",
  privatePersona: "虽然外表幼态，内核却非常直男，能给伴侣拉满的安全感。他的缺点在于有时过于执着于自己的正义观和责任感，导致他在处理情感矛盾时略显生涩和生硬。和他在一起，你永远不用担心被推拉，因为他的偏爱是摊在阳光下的。",
  traits: [
    "阳光直接、责任感、智慧与保护倾向并存。",
    "坚持正义观和责任感可能使情感矛盾处理显得生涩生硬。",
  ],
  romanceTriggers: [
    {
      id: "protective-rescue",
      title: "被保护的“救赎”",
      description: "适合那种你遇到困难（比如被私生饭跟踪），他像小太阳一样冲出来保护你的剧情。这种狮子座的责任感会瞬间拉满，带给你极致的安全感。",
      classification: "Example",
    },
    {
      id: "puzzle-duel",
      title: "智慧博弈",
      description: "和他一起玩密室逃脱或解密游戏，看他那双大眼睛闪烁着聪明的逻辑，并在这个过程中完全主导你。",
      classification: "Example",
    },
  ],
  romanceTaboos: [
    { id: "manipulation", title: "阴湿的手段", description: "他性格阳光直接，最讨厌背后搞小动作、玩心机的人。" },
  ],
  preferredEventTypes: ["relationship", "crisis", "daily"],
  narrativeConstraints: [
    ...sharedCharacterNarrativeConstraints,
    "不能只留下“绝对安全感”，必须保留处理情感矛盾时生涩、生硬的缺点。",
    "保护桥段中的私生跟踪是 Example，不是固定事件或无条件英雄化。",
  ],
  visual: { motif: "SUNLIGHT", color: "butter", monogram: "R", alt: "Ryo 字母视觉占位，非人物肖像" },
};

