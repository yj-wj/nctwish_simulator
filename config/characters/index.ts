import type { Character, CharacterId } from "@/types/character";
import { sion } from "./sion.ts";
import { riku } from "./riku.ts";
import { yushi } from "./yushi.ts";
import { jaehee } from "./jaehee.ts";
import { ryo } from "./ryo.ts";
import { sakuya } from "./sakuya.ts";

export const characterConfig: Character[] = [sion, riku, yushi, jaehee, ryo, sakuya];

export function getCharacter(id: CharacterId): Character {
  return characterConfig.find((character) => character.id === id) ?? sion;
}

export { sion, riku, yushi, jaehee, ryo, sakuya };

