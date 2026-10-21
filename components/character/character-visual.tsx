import type { CharacterPreview } from "@/types/ui";

export function CharacterVisual({ character, small = false }: { character: CharacterPreview; small?: boolean }) {
  return <div className={`character-visual tone-${character.color} ${small ? "small" : ""}`} role="img" aria-label={character.visual.alt}>
    <span className="visual-orbit" /><span className="visual-spark">✳</span><strong>{character.visual.label}</strong>{!small && <><span className="visual-motif">{character.motif}</span><span className="visual-caption">CHARACTER VISUAL · 占位</span></>}
  </div>;
}
