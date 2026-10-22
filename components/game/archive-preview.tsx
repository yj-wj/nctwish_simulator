"use client";

import Link from "next/link";
import { FileHeart, ArrowUpRight } from "lucide-react";
import { useGameStore } from "@/store/game-store";
import { getCharacter } from "@/config/characters";
import { getFanLevel } from "@/config/fan-levels";
import { getGameMode } from "@/config/game-modes";
import { getPlayerIdentity } from "@/config/identities";

export function ArchivePreview() {
  const gameState = useGameStore((state) => state.gameState);
  const receipt = useGameStore((state) => state.receipt);
  if (!gameState) return null;
  const { player } = gameState;
  return <><div className="tab-heading"><p className="eyebrow">A PAGE OF YOUR OWN</p><h1>我的档案</h1><p>先记下你是谁，再慢慢写下故事。</p></div><div className="archive-grid"><section className="paper-panel archive-card"><FileHeart size={26} strokeWidth={1.4} /><h2>{player.name}</h2><p className="muted">统一 GameState 中的角色创建信息</p><dl className="archive-details"><div><dt>年龄</dt><dd>{player.age} 岁</dd></div><div><dt>玩家身份</dt><dd>{getPlayerIdentity(player.identityId).name}</dd></div><div><dt>当前男主</dt><dd>{getCharacter(gameState.maleLead).name}</dd></div><div><dt>追星程度</dt><dd>{getFanLevel(player.fanLevelId).name}</dd></div><div><dt>剧情节奏</dt><dd>{getGameMode(gameState.gameMode).name}</dd></div>{player.identityId === "custom" && <div><dt>自定义身份</dt><dd>{player.customIdentity}</dd></div>}</dl><Link href="/create" className="text-link">返回编辑角色 <ArrowUpRight size={15} /></Link></section>
      <section className="paper-panel archive-card"><p className="eyebrow">CURRENT SESSION</p><h2>最近一次行动</h2>{receipt ? <><p className="archived-action">{receipt.label}</p><p className="muted">{receipt.response}</p></> : <div className="empty-state"><span>✧</span><p>故事刚刚开始</p><small>在剧情页面选择一个选项，或写下自由行动。</small></div>}<div className="archive-notice"><h3>本地存档</h3><p>游戏会自动保存在当前浏览器中。返回首页后，可以通过“继续游戏”恢复最近进度。</p></div></section></div></>;
}
