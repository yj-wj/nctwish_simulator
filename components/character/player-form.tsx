"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Sprout } from "lucide-react";
import { characterConfig } from "@/config/characters";
import { fanLevelConfig } from "@/config/fan-levels";
import { gameModeConfig } from "@/config/game-modes";
import { identityConfig } from "@/config/identities";
import { useGameStore } from "@/store/game-store";
import { playerSchema } from "@/lib/player-schema";
import type { CharacterId } from "@/types/character";
import type { GameModeId, PlayerDraft } from "@/types/game";
import type { FanLevelId } from "@/types/player";

export function PlayerForm() {
  const router = useRouter();
  const draft = useGameStore((state) => state.draft);
  const patch = useGameStore((state) => state.patchDraft);
  const confirm = useGameStore((state) => state.confirmPlayer);
  const [errors, setErrors] = useState<Partial<Record<keyof PlayerDraft, string>>>({});

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = playerSchema.safeParse(draft);
    if (!parsed.success) {
      const issues: typeof errors = {};
      for (const issue of parsed.error.issues) issues[issue.path[0] as keyof PlayerDraft] = issue.message;
      setErrors(issues);
      const first = parsed.error.issues[0]?.path[0];
      if (first) document.getElementById(String(first))?.focus();
      return;
    }
    setErrors({});
    confirm({ ...parsed.data, age: String(parsed.data.age) });
    router.push("/characters");
  }

  return <form onSubmit={submit} noValidate className="creation-form">
    <section className="paper-panel form-section"><div className="panel-heading"><span className="section-number">01</span><h2>先从你开始</h2><Sprout size={20} /></div>
      <div className="field-grid"><div className="field"><label htmlFor="name">你的名字</label><input id="name" autoComplete="nickname" maxLength={24} placeholder="在故事里，我叫……" value={draft.name} onChange={(e) => patch({ name: e.target.value })} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} />{errors.name && <p id="name-error" className="field-error" role="alert">{errors.name}</p>}</div>
        <div className="field"><label htmlFor="age">年龄 <span>仅限成年角色</span></label><input id="age" type="number" min={18} step={1} inputMode="numeric" placeholder="18 岁及以上" value={draft.age} onChange={(e) => patch({ age: e.target.value })} aria-invalid={!!errors.age} aria-describedby={errors.age ? "age-error" : undefined} />{errors.age && <p id="age-error" className="field-error" role="alert">{errors.age}</p>}</div></div>
    </section>
    <fieldset className="paper-panel form-section"><legend>02 · 你的生活，故事的起点</legend><p className="muted mb-5">选择一种身份。你有自己的生活，也将与他的世界产生交集。</p>
      <div className="identity-grid">{identityConfig.map((identity, index) => <label className={`option-card ${draft.identityId === identity.id ? "selected" : ""}`} key={identity.id}>
        <input type="radio" name="identity" value={identity.id} checked={draft.identityId === identity.id} onChange={() => patch({ identityId: identity.id })} />
        <span className="option-top"><span className="option-index">{String.fromCharCode(65 + index)}</span><strong>{identity.name}</strong><span className="check-mark">{draft.identityId === identity.id && <Check size={13} />}</span></span>
        <span className="option-description">{identity.description}</span><span className="option-detail"><b>优势</b> {identity.advantages.join(" ") || "原文未单独规定"}</span><span className="option-detail"><b>风险</b> {identity.risks.join(" ") || "原文未单独规定"}</span>
      </label>)}</div>
      {draft.identityId === "custom" && <div className="field mt-5"><label htmlFor="customIdentity">你的身份与初遇契机</label><textarea id="customIdentity" rows={3} maxLength={300} placeholder="描述你的生活、职业，以及你们可能相遇的契机……" value={draft.customIdentity} onChange={(e) => patch({ customIdentity: e.target.value })} aria-invalid={!!errors.customIdentity} aria-describedby={errors.customIdentity ? "custom-error" : undefined} />{errors.customIdentity && <p id="custom-error" className="field-error" role="alert">{errors.customIdentity}</p>}</div>}
    </fieldset>
    <section className="paper-panel form-section"><div className="panel-heading"><span className="section-number">03</span><h2>相遇前的一点心情</h2></div>
      <div className="field-grid"><div className="field"><label htmlFor="maleLead">想要认识的人 <span>下一步查看角色</span></label><select id="maleLead" value={draft.maleLeadId} onChange={(e) => patch({ maleLeadId: e.target.value as CharacterId })}>{characterConfig.map((character) => <option key={character.id} value={character.id}>{character.name}（{character.displayName}）</option>)}</select></div>
        <div className="field"><label htmlFor="fanLevel">追星程度</label><select id="fanLevel" value={draft.fanLevelId} onChange={(e) => patch({ fanLevelId: e.target.value as FanLevelId })}>{fanLevelConfig.map((level) => <option value={level.id} key={level.id}>{level.name}</option>)}</select></div></div>
      <fieldset className="pace-fieldset"><legend>剧情节奏</legend><div className="pace-grid">{gameModeConfig.map((mode) => <label key={mode.id} className={`pace-option ${draft.gameModeId === mode.id ? "selected" : ""}`}><input type="radio" name="pace" checked={draft.gameModeId === mode.id} onChange={() => patch({ gameModeId: mode.id as GameModeId })} /><strong>{mode.name}</strong><span>{mode.description}</span></label>)}</div></fieldset>
    </section>
    <div className="form-footer"><p>创建信息会写入统一 GameState。</p><button className="button primary" type="submit">确认，选择男主 <ArrowRight size={17} /></button></div>
  </form>;
}
