"use client";

import { useState } from "react";
import { Heart, Hash } from "lucide-react";
import { snsPosts } from "@/mocks/world";

export function SNSPreview() {
  const [liked, setLiked] = useState<string[]>([]);
  return <><div className="tab-heading"><p className="eyebrow">OUTSIDE YOUR STORY</p><h1>SNS 广场</h1><p>舞台的光，也照进每个人普通的一天。</p></div><div className="feed-layout"><div className="sns-feed">{snsPosts.map((post) => <article key={post.id} className="paper-panel sns-post"><header><span className="letter-avatar">{post.initial}</span><div><h2>{post.author}</h2><p>{post.handle}</p></div><span className="sample-tag">虚构样例</span></header><p className="post-text">{post.text}</p><div className="post-footer"><span><Hash size={14} />{post.topic}</span><button aria-label={`赞 ${post.author}`} aria-pressed={liked.includes(post.id)} className={liked.includes(post.id) ? "liked" : ""} onClick={() => setLiked((current) => current.includes(post.id) ? current.filter((id) => id !== post.id) : [...current, post.id])}><Heart size={17} fill={liked.includes(post.id) ? "currentColor" : "none"} />{post.likes + Number(liked.includes(post.id))}</button></div></article>)}</div><aside className="paper-panel feed-note"><p className="eyebrow">A WINDOW TO THE WORLD</p><h2>故事之外</h2><p>这里展示虚构的社交动态。点赞仅用于体验界面，不会影响人气、保密度或其他属性。</p><p className="muted">真实世界联动将留待后续阶段。</p></aside></div></>;
}
