"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { characters } from "@/mocks/characters";
import { useUIStore } from "@/store/ui-store";
import { CharacterVisual } from "./character-visual";

export function CharacterSelection() {
  const router = useRouter();
  const selected = useUIStore((state) => state.draft.maleLead);
  const select = useUIStore((state) => state.selectCharacter);
  const confirm = useUIStore((state) => state.confirmCharacter);
  return <><fieldset><legend className="sr-only">选择男主</legend><div className="character-grid">{characters.map((character, index) => <label key={character.id} className={`character-option ${selected === character.id ? "selected" : ""}`}>
    <input type="radio" name="character" aria-label={`${character.name}（${character.stageName}）`} checked={selected === character.id} onChange={() => select(character.id)} />
    <div className="character-image"><CharacterVisual character={character} /><span className="character-number">NO. 0{index + 1}</span><span className="character-selected">{selected === character.id ? <Check size={16} /> : "+"}</span></div>
    <div className="character-option-copy"><h2>{character.name}<span>{character.stageName}</span></h2><p>{character.subtitle}</p><div className="tag-list">{character.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div>
  </label>)}</div></fieldset>
    <div className="form-footer"><p>六种不同的相遇。此刻，选一个你想了解的人。</p><button className="button primary" onClick={() => { confirm(); router.push("/character-card"); }}>确定，查看角色卡 <ArrowRight size={17} /></button></div>
  </>;
}
