import type { Character } from "@/types/character";
import { sharedCharacterNarrativeConstraints } from "./shared.ts";

export const yushi: Character = {
  id: "yushi",
  name: "得能勇志",
  displayName: "Yushi",
  subtitle: "外星人视角的清淡支配者",
  groupName: "NCT WISH",
  isAdult: true,
  tags: ["处男感", "边界感", "隐性S", "日男氛围"],
  publicPersona: "长相清淡干净，自带一种未经世俗污染的“处男感”。他的思维逻辑像外星人一样清奇，有着极强的日男氛围感。虽然看起来温吞，但在他在乎的事情上，他表现得非常“S”（强势 / 支配）。",
  privatePersona: "他有着白羊座式的自我与清冷的边界感，共情力相对较弱，不太愿意进行程式化的媚粉营业。他其实非常渴望被所有人“宝”着、宠溺着，这种反差让他显得既清高又依赖。和他恋爱需要忍受他偶尔的社交断联，他像个活在自己星球的艺术家，只在某些突如其来的时刻，才会对你展露那个令人惊喜的、害羞的瞬间。",
  traits: [
    "清奇思维、在意之事上的强势、清冷边界与较弱共情并存。",
    "抗拒程式化营业，同时渴望被宠，偶尔社交断联，并会在突发时刻表现害羞。",
  ],
  romanceTriggers: [
    {
      id: "alien-logic-collision",
      title: "外星人式的脑回路碰撞",
      description: "适合那种莫名其妙的约会地点（比如深夜的废弃游乐场）。他在这种怪诞场景下会展现出那种清淡的帅气，并突然提出一些“S”属性的要求（比如让你在那等他三个小时不许动）。",
      classification: "Example",
    },
    {
      id: "being-cherished",
      title: "被“宝”宠的瞬间",
      description: "当你像宠孩子一样无条件宠溺他的奇怪逻辑时，他会露出那种罕见的、令人心动的害羞表情。",
      classification: "Example",
    },
  ],
  romanceTaboos: [
    { id: "excessiveMonitoring", title: "越界查岗", description: "极度反感被问“你在干嘛”“你为什么不回信息”。他的边界感神圣不可侵犯，过度关心只会让他想逃到另一个星球。" },
    { id: "forcedFanservice", title: "平庸的营业", description: "强迫他像其他爱豆那样做油腻的媚粉动作。" },
  ],
  preferredEventTypes: ["relationship", "daily"],
  narrativeConstraints: [
    ...sharedCharacterNarrativeConstraints,
    "不得把“等三个小时”实现成固定计时任务或固定惩罚。",
    "不能将渴望被宠删除，也不能因此抹去他的边界感和较弱共情。",
  ],
  visual: { motif: "ORBIT", color: "blue", monogram: "Y", alt: "Yushi 字母视觉占位，非人物肖像" },
};

