import { z } from "zod";
import { characterConfig } from "@/config/characters";
import { fanLevelConfig } from "@/config/fan-levels";
import { gameModeConfig } from "@/config/game-modes";
import { identityConfig } from "@/config/identities";
import type { CharacterId } from "@/types/character";
import type { GameModeId } from "@/types/game";
import type { FanLevelId, PlayerIdentityId } from "@/types/player";

const identityIds = identityConfig.map(({ id }) => id) as [PlayerIdentityId, ...PlayerIdentityId[]];
const characterIds = characterConfig.map(({ id }) => id) as [CharacterId, ...CharacterId[]];
const fanLevelIds = fanLevelConfig.map(({ id }) => id) as [FanLevelId, ...FanLevelId[]];
const gameModeIds = gameModeConfig.map(({ id }) => id) as [GameModeId, ...GameModeId[]];

// Form validation only; no narrative validation or game rules.
export const playerSchema = z.object({
  name: z.string().trim().min(1, "请填写你的名字。").max(24, "名字最多 24 个字。"),
  age: z.string().trim().regex(/^\d+$/, "请填写整数年龄。").transform(Number).pipe(z.number().int().min(18, "本游戏角色须年满 18 岁。")),
  identityId: z.enum(identityIds),
  customIdentity: z.string().trim().max(300, "自定义身份最多 300 字。"),
  maleLeadId: z.enum(characterIds),
  fanLevelId: z.enum(fanLevelIds),
  gameModeId: z.enum(gameModeIds),
}).superRefine((value, context) => {
  if (value.identityId === "custom" && !value.customIdentity) {
    context.addIssue({ code: "custom", path: ["customIdentity"], message: "请描述你的身份与初遇契机。" });
  }
});
