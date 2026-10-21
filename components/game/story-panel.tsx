"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, Check, CornerDownLeft, Feather, MapPin } from "lucide-react";
import { mockStories } from "@/mocks/story";
import { getCharacter } from "@/config/characters";
import { getEventTemplate } from "@/config/event-pool";
import { useGameStore } from "@/store/game-store";
import { CharacterVisual } from "@/components/character/character-visual";
import { NightGarden } from "@/components/common/night-garden";

export function StoryPanel() {
  const draft = useGameStore((state) => state.draft);
  const gameState = useGameStore((state) => state.gameState);
  const receipt = useGameStore((state) => state.receipt);
  const freeAction = useGameStore((state) => state.freeAction);
  const setFreeAction = useGameStore((state) => state.setFreeAction);
  const storyIndex = useGameStore((state) => state.storyIndex);
  const previousChoice = useGameStore((state) => state.previousChoice);
  const currentStory = useGameStore((state) => state.currentStory);
  const turnStatus = useGameStore((state) => state.turnStatus);
  const turnError = useGameStore((state) => state.turnError);
  const lastTurnTrace = useGameStore((state) => state.lastTurnTrace);
  const processPresetChoice = useGameStore((state) => state.processPresetChoice);
  const processFreeAction = useGameStore((state) => state.processFreeAction);
  const selectedEventId = useGameStore((state) => state.selectedEventId);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [error, setError] = useState("");
  const character = getCharacter(gameState?.maleLead ?? draft.maleLeadId);
  const mockStory = mockStories[storyIndex];
  const story = currentStory ? {
    title: currentStory.title,
    time: `第 ${gameState?.week ?? 1} 周 · AI TURN`,
    sourceLabel: "AI 剧情 · 已验证并结算",
    subtitle: "每一次选择都会经过规则、状态与记忆系统。",
    paragraphs: currentStory.story.split(/\n+/).filter(Boolean),
    choices: currentStory.choices,
  } : mockStory;
  const selectedEvent = selectedEventId ? getEventTemplate(selectedEventId) : undefined;
  const isBusy = ["interpreting", "generating", "validating", "settling"].includes(turnStatus);
  const statusCopy = {
    interpreting: "正在理解你的行动…",
    generating: "正在生成剧情…",
    validating: "正在验证剧情建议…",
    settling: "正在结算…",
  }[turnStatus as "interpreting" | "generating" | "validating" | "settling"];

  useEffect(() => {
    if (previousChoice) {
      titleRef.current?.focus({ preventScroll: true });
      titleRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [storyIndex, previousChoice, lastTurnTrace?.turnId]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!freeAction.trim()) { setError("请先写下你想做的行动。"); return; }
    if (isBusy) return;
    setError("");
    await processFreeAction();
  }

  return <div className="story-layout"><article className="paper-panel story-paper">
    <div className="story-kicker"><span><Feather size={15} /> {story.sourceLabel}</span><span>{story.time}</span></div>
    <h1 ref={titleRef} tabIndex={-1}>{story.title}</h1><p className="story-deck">{story.subtitle}</p>
    <p className="reference-note">Phase 5C · A/B/C 与自由行动均通过 Rule → AI → State / History / Memory → Auto Save 完整链路。</p>
    {previousChoice && <p className="reference-note" aria-label="上一轮选择">上一轮选择：{previousChoice.id} · {previousChoice.text}</p>}
    {selectedEvent && <section className="mock-event-card" aria-label="Event Engine 选中的事件"><span>{selectedEvent.category}</span><div><small>EVENT ENGINE · NEXT EVENT</small><h2>{selectedEvent.title}</h2><p>{selectedEvent.description}</p></div></section>}
    <div className="story-divider"><span>✳</span></div>
    <div className="story-body">{story.paragraphs.map((paragraph, index) => <p key={index} className={paragraph.startsWith("“") ? "dialogue" : ""}>{paragraph}</p>)}</div>
    <section className="actions-section" aria-labelledby="action-title"><div className="actions-title"><h2 id="action-title">此刻，你会怎么做？</h2><span>YOUR CHOICE</span></div>
      <div className="choices">{story.choices.map((choice) => <button className="story-choice" key={choice.id} disabled={isBusy} onClick={async () => { setError(""); await processPresetChoice(choice.id); }}><span className="choice-letter">{choice.id}</span><span>{choice.text}</span><ArrowUpRight size={17} /></button>)}</div>
      <div className="free-action-separator"><span>或者，按照你的想法行动</span></div>
      <form className="free-action" onSubmit={submit}><label htmlFor="freeAction">D · 自由行动</label><textarea id="freeAction" rows={3} placeholder="我想……（写下你想说的话，或想做的事）" maxLength={500} disabled={isBusy} value={freeAction} onChange={(e) => { setFreeAction(e.target.value); setError(""); }} aria-invalid={!!error || !!turnError} aria-describedby={error || turnError ? "action-error" : "action-help"} /><div className="free-action-footer"><small id="action-help">{freeAction.length} / 500 · 最多 500 字</small><button className="button primary small-button" type="submit" disabled={isBusy}>{isBusy ? "处理中…" : "提交行动"} <CornerDownLeft size={15} /></button></div>{(error || turnError) && <p className="field-error" id="action-error" role="alert">{error || turnError}</p>}</form>
      <div role="status" aria-live="polite">{statusCopy && <div className="action-receipt turn-loading"><div><strong>{statusCopy}</strong><p>本回合完成前不会修改任何正式状态。</p></div></div>}{!statusCopy && receipt && <div className="action-receipt"><Check size={18} /><div><strong>{receipt.response}</strong><p>你的行动：{receipt.label}</p></div></div>}</div>
    </section>
  </article>
    <aside className="story-sidebar"><section className="paper-panel companion-card"><div className="aside-heading"><span>这次相遇的人</span><span>01</span></div><CharacterVisual character={character} /><div className="companion-copy"><p className="eyebrow">{character.displayName.toUpperCase()}</p><h2>{character.name}</h2><p>{character.subtitle}</p><Link href="/game/characters">查看人物档案 <ArrowUpRight size={15} /></Link></div></section>
      <section className="scene-card"><NightGarden compact /><div><p className="eyebrow">SOMEWHERE IN SEOUL</p><p><MapPin size={14} />{gameState?.currentScene ?? "首尔汝矣岛电视台后门"}</p></div></section>
      <p className="margin-note">“你仍然有自己的生活，<br />他也仍然属于舞台。”<span>GARDEN · 故事的另一面</span></p>
      <p className="reference-note">开局保留原文模板；完成一次选择后显示经过 Schema 与规则验证的 AI / Mock Provider 剧情。</p>
    </aside>
  </div>;
}
