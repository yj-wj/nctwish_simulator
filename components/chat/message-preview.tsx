"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { messageThreads } from "@/mocks/world";

export function MessagePreview() {
  const [selectedId, setSelectedId] = useState(messageThreads[0].id);
  const selected = messageThreads.find((thread) => thread.id === selectedId)!;
  return <><div className="tab-heading"><p className="eyebrow">LITTLE CONVERSATIONS</p><h1>消息</h1><p>那些来自日常生活的问候。</p></div>
    <section className="paper-panel chat-layout"><nav className="thread-list" aria-label="示例会话">{messageThreads.map((thread) => <button key={thread.id} className={`thread-item ${selectedId === thread.id ? "active" : ""}`} aria-pressed={selectedId === thread.id} onClick={() => setSelectedId(thread.id)}><span className="letter-avatar">{thread.initial}</span><span><strong>{thread.name}</strong><small>{thread.role}</small></span><MessageCircle size={17} /></button>)}</nav>
      <div className="conversation"><header><h2>{selected.name}</h2><span>静态会话样例</span></header><p className="chat-date">第 1 周 · 示例</p><div className="chat-messages">{selected.messages.map((message) => <p key={message} className="chat-bubble">{message}</p>)}</div><p className="empty-note">消息发送与角色回复尚未开放。此处仅预览会话布局。</p></div>
    </section></>;
}
