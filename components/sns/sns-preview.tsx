"use client";

import { useEffect } from "react";
import { AlertCircle, Building2, Eye, Hash, Heart, LoaderCircle, MessageCircle, Radio, Repeat2, UsersRound } from "lucide-react";
import { snsDebugFixtures } from "@/config/sns";
import { useGameStore } from "@/store/game-store";
import type { SNSAccountType, SNSSentiment } from "@/types/sns";

const busyStatuses = new Set(["generating", "validating", "settling"]);
const accountLabels: Record<SNSAccountType, string> = {
  official: "官方", company: "公司", media: "媒体", fansite: "站点", fan: "粉丝", anonymous: "匿名",
};
const accountIcons: Record<SNSAccountType, typeof Radio> = {
  official: Radio, company: Building2, media: Eye, fansite: UsersRound, fan: Heart, anonymous: MessageCircle,
};
const sentimentLabels: Record<SNSSentiment, string> = { positive: "正向", neutral: "中性", mixed: "讨论中", negative: "负向" };

export function SNSPreview() {
  const gameState = useGameStore((state) => state.gameState);
  const posts = useGameStore((state) => state.snsPosts);
  const triggers = useGameStore((state) => state.snsTriggers);
  const status = useGameStore((state) => state.snsStatus);
  const error = useGameStore((state) => state.snsError);
  const trace = useGameStore((state) => state.lastSNSTrace);
  const processPending = useGameStore((state) => state.processPendingSNS);
  const markRead = useGameStore((state) => state.markSNSRead);
  const enqueueFixture = useGameStore((state) => state.enqueueSNSFixture);
  const busy = busyStatuses.has(status);
  const ordered = [...posts].sort((left, right) => right.sequence - left.sequence);
  const unread = posts.filter(({ read }) => !read).length;

  useEffect(() => { if (gameState) void processPending(); }, [gameState, processPending]);
  useEffect(() => { if (unread > 0) markRead(); }, [markRead, unread]);

  if (!gameState) return null;
  return <>
    <div className="tab-heading"><p className="eyebrow">PUBLIC OPINION FEED</p><h1>SNS 广场</h1><p>公开事件会在这里形成讨论，并通过正式结算影响故事。</p></div>
    <div className="feed-layout">
      <div className="sns-feed" aria-live="polite">
        {busy && <div className="paper-panel sns-feed-state"><LoaderCircle className="spin" size={22} /><p>正在整理公开讨论…</p></div>}
        {error && <div className="paper-panel sns-feed-state sns-error" role="alert"><AlertCircle size={22} /><p>{error}</p><button onClick={() => void processPending()}>重试</button></div>}
        {!busy && ordered.length === 0 && <div className="paper-panel sns-feed-state"><Hash size={24} /><h2>目前没有新动态</h2><p>普通私人剧情不会自动生成 SNS。公开活动、偷拍视频、传闻或公司声明出现后，这里才会更新。</p></div>}
        {ordered.map((post) => {
          const Icon = accountIcons[post.accountType];
          return <article key={post.id} className={`paper-panel sns-post sns-${post.sentiment}`}>
            <header><span className="letter-avatar"><Icon size={18} /></span><div><h2>{post.authorName}</h2><p>{post.handle} · {accountLabels[post.accountType]}</p></div><span className="sample-tag">{sentimentLabels[post.sentiment]}</span></header>
            <p className="post-text">{post.content}</p>
            <div className="sns-topics">{post.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
            <div className="post-footer"><span>第 {post.week} 周 · 热度 {post.reactions.heat}</span><span className="sns-reactions"><Heart size={15} />{post.reactions.likes}<Repeat2 size={15} />{post.reactions.reposts}<MessageCircle size={15} />{post.reactions.comments}</span></div>
          </article>;
        })}
      </div>
      <aside className="paper-panel feed-note"><p className="eyebrow">SYSTEM DRIVEN</p><h2>当前舆论</h2><p>待处理 Trigger：{triggers.filter(({ status: value }) => value === "pending").length}</p><p>已发布帖子：{posts.length}</p><p className="muted">内容由 AI 撰写；公开条件、状态变化和记忆写入由规则系统处理。</p></aside>
    </div>
    {process.env.NODE_ENV === "development" && <details className="engine-debug sns-debug"><summary>Development · SNS Trigger / Trace</summary><div className="debug-content">
      <div className="debug-controls">{snsDebugFixtures.map((fixture) => <button key={fixture.id} onClick={() => enqueueFixture(fixture.id)}>Queue: {fixture.label}</button>)}<button disabled={busy} onClick={() => void processPending()}>Process Pending SNS</button></div>
      {trace ? <><p><strong>Trigger：</strong>{trace.trigger.reason} · {trace.trigger.level}</p><p><strong>Source：</strong>{trace.trigger.sourceEventId ?? trace.trigger.sourceTurnId ?? "system"}</p><p><strong>Posts：</strong>{trace.acceptedPostCount} accepted · {trace.rejectedPosts.length} rejected</p><p><strong>Effects：</strong>{JSON.stringify(trace.appliedEffects)}</p><p><strong>Rule：</strong>{trace.ruleEvaluation.riskLevel} · {trace.ruleEvaluation.warnings.join(", ") || "no warning"}</p><p><strong>Memory：</strong>{trace.memoryWritten ? "written" : "not required"}</p><pre className="ai-json-preview">{JSON.stringify(trace.context, null, 2)}</pre></> : <p>处理一个 SNS Trigger 后显示生成与结算记录。</p>}
    </div></details>}
  </>;
}
