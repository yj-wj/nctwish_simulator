import type { FanLevel } from "@/types/player";

export const fanLevelConfig: FanLevel[] = [
  { id: "longtime", name: "nct老粉" },
  { id: "casual", name: "普通韩娱瓜众" },
  { id: "passerby", name: "纯路人，无感" },
  { id: "returning", name: "曾经脱粉，重新遇见后心情复杂" },
  { id: "single", name: "只喜欢某一位成员，身份更敏感" },
];

export function getFanLevel(id: FanLevel["id"]): FanLevel {
  return fanLevelConfig.find((level) => level.id === id) ?? fanLevelConfig[2];
}

