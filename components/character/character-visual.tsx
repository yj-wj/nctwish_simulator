import type { Character } from "@/types/character";

export function CharacterVisual({ character, small = false }: { character: Character; small?: boolean }) {
  return <div className={`character-visual tone-${character.visual.color} ${small ? "small" : ""}`} role="img" aria-label={character.visual.alt}>
    <span className="visual-orbit" /><span className="visual-spark">✳</span><strong>{character.visual.monogram}</strong>{!small && <><span className="visual-motif">{character.visual.motif}</span><span className="visual-caption">CHARACTER VISUAL · 占位</span></>}
  </div>;
}
