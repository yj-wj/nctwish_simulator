"use client";

import { FormEvent, useEffect } from "react";
import { MessageCircle, Send, UserRound } from "lucide-react";
import { getCharacter } from "@/config/characters";
import { incomingMessageFixtures } from "@/config/chat";
import { getChatThreadId } from "@/game/chatEngine";
import { useGameStore } from "@/store/game-store";

const busyStatuses = new Set(["generating", "validating", "settling"]);

export function MessagePreview() {
  const gameState = useGameStore((state) => state.gameState);
  const threads = useGameStore((state) => state.chatThreads);
  const messages = useGameStore((state) => state.chatMessages);
  const input = useGameStore((state) => state.chatInput);
  const status = useGameStore((state) => state.chatStatus);
  const error = useGameStore((state) => state.chatError);
  const trace = useGameStore((state) => state.lastChatTrace);
  const setInput = useGameStore((state) => state.setChatInput);
  const sendMessage = useGameStore((state) => state.sendChatMessage);
  const markRead = useGameStore((state) => state.markChatRead);
  const enqueueFixture = useGameStore((state) => state.enqueueIncomingFixture);
  const processPending = useGameStore((state) => state.processPendingIncoming);
  const threadId = gameState ? getChatThreadId(gameState.maleLead) : "";
  const thread = threads.find(({ id }) => id === threadId);
  const threadMessages = messages.filter((message) => message.threadId === threadId).sort((a, b) => a.sequence - b.sequence);
  const busy = busyStatuses.has(status);

  useEffect(() => { if (gameState) void processPending(); }, [gameState, processPending]);
  useEffect(() => { if (threadId && thread?.unreadCount) markRead(threadId); }, [markRead, thread?.unreadCount, threadId]);

  if (!gameState) return null;
  const character = getCharacter(gameState.maleLead);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!busy) void sendMessage(threadId);
  };

  return <>
    <div className="tab-heading"><p className="eyebrow">LITTLE CONVERSATIONS</p><h1>消息</h1><p>主剧情与聊天共享关系、记忆和剧情事实。</p></div>
    <section className="paper-panel chat-layout real-chat-layout">
      <nav className="thread-list" aria-label="会话列表">
        <button className="thread-item active" aria-pressed="true"><span className="letter-avatar">{character.displayName.slice(0, 1)}</span><span><strong>{character.name}</strong><small>{threadMessages.at(-1)?.content ?? "开始一段对话"}</small></span><MessageCircle size={17} /></button>
      </nav>
      <div className="conversation real-conversation">
        <header><div><h2>{character.name}</h2><span>{character.displayName} · 当前男主</span></div><small>{busy ? "正在回复…" : "AI Chat"}</small></header>
        <p className="chat-date">第 {gameState.week} 周 · 私人消息</p>
        <div className="chat-messages real-chat-messages" aria-live="polite">
          {threadMessages.length === 0 && <div className="chat-empty"><UserRound size={26} /><p>还没有消息。你可以先发一句自然的问候。</p></div>}
          {threadMessages.map((message) => <div key={message.id} className={`chat-line ${message.source === "player" ? "from-player" : "from-ai"}`}><p className="chat-bubble">{message.content}</p><small>第 {message.week} 周 · #{message.sequence}</small></div>)}
          {busy && <div className="chat-line from-ai"><p className="chat-bubble chat-typing">{status === "settling" ? "正在保存这段对话…" : "正在输入…"}</p></div>}
        </div>
        <form className="chat-composer" onSubmit={submit}>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} maxLength={500} disabled={busy} placeholder={`给 ${character.name} 发消息…`} aria-label="聊天消息" />
          <div><small>{input.length}/500</small><button className="button primary" disabled={busy || !input.trim()}><Send size={16} />发送</button></div>
        </form>
        {error && <p className="chat-error" role="alert">{error}</p>}
      </div>
    </section>
    {process.env.NODE_ENV === "development" && <details className="engine-debug chat-debug"><summary>Development · Chat Context / Turn Trace</summary><div className="debug-content">
      <div className="debug-controls">{incomingMessageFixtures.map((fixture) => <button key={fixture.id} onClick={() => enqueueFixture(fixture.id)}>Queue: {fixture.label}</button>)}</div>
      {trace ? <><div className="ai-context-counts"><p><b>{trace.context.context.gameState.relationshipStage}</b><small>relationshipStage</small></p><p><b>{trace.context.context.diagnostics.recentMessagesCount}</b><small>recent messages</small></p><p><b>{trace.context.context.diagnostics.relevantMemoriesCount}</b><small>relevant memories</small></p><p><b>{trace.context.context.diagnostics.excludedHiddenMemories}</b><small>excluded hidden</small></p></div>
        <p><strong>Story Facts：</strong>{trace.context.context.storyFacts.join(", ") || "none"}</p><p><strong>Rule：</strong>{trace.ruleEvaluation.riskLevel} · {trace.ruleEvaluation.violatedRules.join(", ") || "no violation"}</p><p><strong>AI Reply：</strong>{trace.output.messages.join(" / ")}</p><p><strong>Settlement：</strong>{JSON.stringify(trace.proposal.appliedEffects)} · spamLimited={String(trace.proposal.spamLimited)}</p><p><strong>Memory：</strong>{trace.proposal.memoryEffectsCount} accepted · {trace.proposal.rejectedMemories.length} rejected</p><pre className="ai-json-preview">{JSON.stringify(trace.context, null, 2)}</pre></> : <p>完成一次聊天后显示 Context 与 Trace。</p>}
    </div></details>}
  </>;
}
