"use client";

import { ArrowRight, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { getCharacter } from "@/mocks/characters";
import { identities, fanLevels, paces } from "@/mocks/setup-options";
import { previewContext } from "@/mocks/story";
import { useUIStore } from "@/store/ui-store";
import { CharacterVisual } from "./character-visual";

export function CharacterProfile({ inGame = false }: { inGame?: boolean }) {
  const router = useRouter();
  const draft = useUIStore((state) => state.draft);
  const enter = useUIStore((state) => state.enterPreview);
  const character = getCharacter(draft.maleLead);
  return <><div className="profile-layout">
    <aside className="profile-portrait"><CharacterVisual character={character} /><div className="portrait-footnote"><span>NCT WISH</span><span>平行世界 · 成年</span></div><p className="muted">字母为角色视觉占位，后续可替换为虚构插画。</p></aside>
    <div className="profile-copy"><p className="eyebrow">CHARACTER FILE / {character.stageName.toUpperCase()}</p><h2 className="profile-name">{character.name}<span>{character.stageName}</span></h2><p className="profile-subtitle">{character.subtitle}</p><div className="tag-list">{character.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
      <dl className="profile-matrix"><div><dt>年龄阶段</dt><dd>成年</dd></div><div><dt>身份 / 组合</dt><dd>NCT WISH 成员</dd></div><div><dt>所属公司</dt><dd>公司（虚构背景）</dd></div><div><dt>粉丝名</dt><dd>珍妮、花园丝</dd></div><div><dt>事业阶段</dt><dd>{previewContext.careerStage} · 样例</dd></div><div><dt>初始关系</dt><dd>陌生人</dd></div><div><dt>身高</dt><dd>模糊处理</dd></div></dl>
      <section className="profile-description"><h3>人物印象</h3><p>{character.description}</p></section>
      <p className="reference-note">以下为原文人设参考，不是玩家已知的剧情事实。</p>
      <details className="disclosure"><summary>档案详情 · 私下性格 <ChevronDown size={16} /></summary><p>{character.privateSide}</p><p>{character.detail}</p></details>
      <details className="disclosure"><summary>恋爱雷区 · 原文条目 <ChevronDown size={16} /></summary><ul>{character.taboos.map((taboo) => <li key={taboo}>{taboo}</li>)}</ul></details>
      <details className="disclosure"><summary>细节挖掘 · 设定观察 <ChevronDown size={16} /></summary><p>{character.detail}</p><p>此处仅展示原文推荐方向，尚未解锁额外故事、习惯或口头禅。</p></details>
    </div>
  </div>
    <section className="paper-panel pairing-summary"><div><p className="eyebrow">YOUR SIDE OF THE STORY</p><h3>{draft.name} <span>×</span> {character.name}</h3><p>{draft.age} 岁 · {identities.find((item) => item.id === draft.identity)?.label} · {paces.find((item) => item.id === draft.pace)?.label}</p><p>{fanLevels.find((item) => item.id === draft.fanLevel)?.label}</p>{draft.identity === "custom" && <p>{draft.customIdentity}</p>}</div><div className="initial-stats"><span>好感度 <b>8</b></span><span>保密度 <b>100</b></span><span>公司警觉 <b>18</b></span><span>事业压力 <b>67</b></span><small>固定样例初始值</small></div></section>
    {!inGame && <div className="form-footer"><p>相遇从陌生开始，你也仍然拥有自己的生活。</p><button className="button primary" onClick={() => { enter(); router.push("/game"); }}>进入剧情 <ArrowRight size={17} /></button></div>}
  </>;
}
