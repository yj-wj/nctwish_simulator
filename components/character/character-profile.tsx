"use client";

import { ArrowRight, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { getCharacter } from "@/config/characters";
import { getFanLevel } from "@/config/fan-levels";
import { getGameMode } from "@/config/game-modes";
import { getPlayerIdentity } from "@/config/identities";
import { useGameStore } from "@/store/game-store";
import { CharacterVisual } from "./character-visual";

export function CharacterProfile({ inGame = false }: { inGame?: boolean }) {
  const router = useRouter();
  const draft = useGameStore((state) => state.draft);
  const gameState = useGameStore((state) => state.gameState);
  const enter = useGameStore((state) => state.enterGame);
  const character = getCharacter(gameState?.maleLead ?? draft.maleLeadId);
  const stats = gameState?.stats;
  return <><div className="profile-layout">
    <aside className="profile-portrait"><CharacterVisual character={character} /><div className="portrait-footnote"><span>NCT WISH</span><span>平行世界 · 成年</span></div><p className="muted">字母为角色视觉占位，后续可替换为虚构插画。</p></aside>
    <div className="profile-copy"><p className="eyebrow">CHARACTER FILE / {character.displayName.toUpperCase()}</p><h2 className="profile-name">{character.name}<span>{character.displayName}</span></h2><p className="profile-subtitle">{character.subtitle}</p><div className="tag-list">{character.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
      <dl className="profile-matrix"><div><dt>年龄阶段</dt><dd>成年</dd></div><div><dt>身份 / 组合</dt><dd>{character.groupName} 成员</dd></div><div><dt>所属公司</dt><dd>公司（虚构背景）</dd></div><div><dt>粉丝名</dt><dd>珍妮、花园丝</dd></div><div><dt>事业阶段</dt><dd>{gameState?.careerStage ?? "回归期"} · Phase 2 初始状态</dd></div><div><dt>初始关系</dt><dd>陌生人</dd></div><div><dt>身高</dt><dd>模糊处理</dd></div></dl>
      <section className="profile-description"><h3>人物印象</h3><p>{character.publicPersona}</p></section>
      <p className="reference-note">以下为原文人设参考，不是玩家已知的剧情事实。</p>
      <details className="disclosure"><summary>档案详情 · 私下性格 <ChevronDown size={16} /></summary><p>{character.privatePersona ?? "原文未单设独立的“真实侧面”段落；相关反差保留在推荐剧情示例中。"}</p>{character.traits.map((trait) => <p key={trait}>{trait}</p>)}</details>
      <details className="disclosure"><summary>恋爱雷区 · 原文条目 <ChevronDown size={16} /></summary><ul>{character.romanceTaboos.map((taboo) => <li key={taboo.title}><strong>{taboo.title}：</strong>{taboo.description}</li>)}</ul></details>
      <details className="disclosure"><summary>细节挖掘 · 设定观察 <ChevronDown size={16} /></summary>{character.romanceTriggers.map((example) => <p key={example.id}><strong>{example.title}：</strong>{example.description}</p>)}<p>以上桥段均为 Example，不是固定触发规则或陌生阶段的互动许可。</p></details>
    </div>
  </div>
    <section className="paper-panel pairing-summary"><div><p className="eyebrow">YOUR SIDE OF THE STORY</p><h3>{gameState?.player.name ?? draft.name} <span>×</span> {character.name}</h3><p>{gameState?.player.age ?? draft.age} 岁 · {getPlayerIdentity(gameState?.player.identityId ?? draft.identityId).name} · {getGameMode(gameState?.gameMode ?? draft.gameModeId).name}</p><p>{getFanLevel(gameState?.player.fanLevelId ?? draft.fanLevelId).name}</p>{(gameState?.player.identityId ?? draft.identityId) === "custom" && <p>{gameState?.player.customIdentity ?? draft.customIdentity}</p>}</div><div className="initial-stats"><span>好感度 <b>{stats?.affection ?? 8}</b></span><span>保密度 <b>{stats?.secrecy ?? 100}</b></span><span>公司警觉 <b>{stats?.companyAlert ?? 18}</b></span><span>事业压力 <b>{stats?.careerPressure ?? 67}</b></span><small>来自统一 GameState</small></div></section>
    {!inGame && <div className="form-footer"><p>相遇从陌生开始，你也仍然拥有自己的生活。</p><button className="button primary" onClick={() => { enter(); router.push("/game"); }}>进入剧情 <ArrowRight size={17} /></button></div>}
  </>;
}
