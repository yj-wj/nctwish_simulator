import type { GameMode } from "@/types/game";

export const gameModeConfig: GameMode[] = [
  { id: "slow", name: "慢热现实向", description: "感情推进缓慢，重细节与拉扯。" },
  { id: "standard", name: "标准韩剧向", description: "甜虐均衡，事业与恋爱并行。" },
  { id: "pressure", name: "高压舆论向", description: "危机较多，公司与粉圈压力更强。" },
  { id: "healing", name: "日常治愈向", description: "甜度较高，但仍保留现实阻碍。" },
];

export function getGameMode(id: GameMode["id"]): GameMode {
  return gameModeConfig.find((mode) => mode.id === id) ?? gameModeConfig[0];
}

