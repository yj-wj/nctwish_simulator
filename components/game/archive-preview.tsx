"use client";

import Link from "next/link";
import { FileHeart, ArrowUpRight } from "lucide-react";
import { useUIStore } from "@/store/ui-store";
import { getCharacter } from "@/mocks/characters";
import { identities, fanLevels, paces } from "@/mocks/setup-options";

export function ArchivePreview() {
  const draft = useUIStore((state) => state.draft);
  const receipt = useUIStore((state) => state.receipt);
  return <><div className="tab-heading"><p className="eyebrow">A PAGE OF YOUR OWN</p><h1>我的档案</h1><p>先记下你是谁，再慢慢写下故事。</p></div><div className="archive-grid"><section className="paper-panel archive-card"><FileHeart size={26} strokeWidth={1.4} /><h2>{draft.name}</h2><p className="muted">本次角色创建信息</p><dl className="archive-details"><div><dt>年龄</dt><dd>{draft.age} 岁</dd></div><div><dt>玩家身份</dt><dd>{identities.find((item) => item.id === draft.identity)?.label}</dd></div><div><dt>当前男主</dt><dd>{getCharacter(draft.maleLead).name}</dd></div><div><dt>追星程度</dt><dd>{fanLevels.find((item) => item.id === draft.fanLevel)?.label}</dd></div><div><dt>剧情节奏</dt><dd>{paces.find((item) => item.id === draft.pace)?.label}</dd></div>{draft.identity === "custom" && <div><dt>自定义身份</dt><dd>{draft.customIdentity}</dd></div>}</dl><Link href="/create" className="text-link">返回编辑角色 <ArrowUpRight size={15} /></Link></section>
      <section className="paper-panel archive-card"><p className="eyebrow">CURRENT SESSION</p><h2>最近一次行动</h2>{receipt ? <><p className="archived-action">{receipt.label}</p><p className="muted">{receipt.response}</p></> : <div className="empty-state"><span>✧</span><p>故事刚刚开始</p><small>在剧情页面选择一个选项，或写下自由行动。</small></div>}<div className="archive-notice"><h3>关于本次预览</h3><p>创建信息与行动仅在当前页面会话内保留。刷新后需重新创建；正式存档、事件历史和记忆系统尚未实现。</p></div></section></div></>;
}
