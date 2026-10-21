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
  const record = useGameStore((state) => state.recordAction);
  const freeAction = useGameStore((state) => state.freeAction);
  const setFreeAction = useGameStore((state) => state.setFreeAction);
  const storyIndex = useGameStore((state) => state.storyIndex);
  const previousChoice = useGameStore((state) => state.previousChoice);
  const advance = useGameStore((state) => state.advanceMockStory);
  const selectedEventId = useGameStore((state) => state.selectedEventId);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [error, setError] = useState("");
  const character = getCharacter(gameState?.maleLead ?? draft.maleLeadId);
  const story = mockStories[storyIndex];
  const selectedEvent = selectedEventId ? getEventTemplate(selectedEventId) : undefined;

  useEffect(() => {
    if (previousChoice) {
      titleRef.current?.focus({ preventScroll: true });
      titleRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [storyIndex, previousChoice]);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!freeAction.trim()) { setError("请先写下你想做的行动。"); return; }
    record({ label: freeAction.trim(), response: "自由行动已收到。当前为界面预览，尚未进行行动理解或生成后续剧情。" });
    setError("");
  }

  return <div className="story-layout"><article className="paper-panel story-paper">
    <div className="story-kicker"><span><Feather size={15} /> {story.sourceLabel}</span><span>{story.time}</span></div>
    <h1 ref={titleRef} tabIndex={-1}>{story.title}</h1><p className="story-deck">{story.subtitle}</p>
    <p className="reference-note">Mock 剧情 {storyIndex + 1} / {mockStories.length} · A/B/C 使用结构化 Mock Effect 结算并切换到下一段。</p>
    {previousChoice && <p className="reference-note" aria-label="上一轮选择">上一轮选择：{previousChoice.id} · {previousChoice.text}</p>}
    {selectedEvent && <section className="mock-event-card" aria-label="Event Engine 选中的 Mock 事件"><span>{selectedEvent.category}</span><div><small>EVENT ENGINE · MOCK</small><h2>{selectedEvent.title}</h2><p>{selectedEvent.description}</p></div></section>}
    <div className="story-divider"><span>✳</span></div>
    <div className="story-body">{story.paragraphs.map((paragraph, index) => <p key={index} className={paragraph.startsWith("“") ? "dialogue" : ""}>{paragraph}</p>)}</div>
    <section className="actions-section" aria-labelledby="action-title"><div className="actions-title"><h2 id="action-title">此刻，你会怎么做？</h2><span>YOUR CHOICE</span></div>
      <div className="choices">{story.choices.map((choice) => <button className="story-choice" key={choice.id} onClick={() => { advance(choice.id); setError(""); }}><span className="choice-letter">{choice.id}</span><span>{choice.text}</span><ArrowUpRight size={17} /></button>)}</div>
      <div className="free-action-separator"><span>或者，按照你的想法行动</span></div>
      <form className="free-action" onSubmit={submit}><label htmlFor="freeAction">D · 自由行动</label><textarea id="freeAction" rows={3} placeholder="我想……（写下你想说的话，或想做的事）" maxLength={500} value={freeAction} onChange={(e) => { setFreeAction(e.target.value); setError(""); }} aria-invalid={!!error} aria-describedby={error ? "action-error" : "action-help"} /><div className="free-action-footer"><small id="action-help">{freeAction.length} / 500 · 仅本次会话</small><button className="button primary small-button" type="submit">提交行动 <CornerDownLeft size={15} /></button></div>{error && <p className="field-error" id="action-error" role="alert">{error}</p>}</form>
      <div role="status" aria-live="polite">{receipt && <div className="action-receipt"><Check size={18} /><div><strong>{receipt.response}</strong><p>你的行动：{receipt.label}</p></div></div>}</div>
    </section>
  </article>
    <aside className="story-sidebar"><section className="paper-panel companion-card"><div className="aside-heading"><span>这次相遇的人</span><span>01</span></div><CharacterVisual character={character} /><div className="companion-copy"><p className="eyebrow">{character.displayName.toUpperCase()}</p><h2>{character.name}</h2><p>{character.subtitle}</p><Link href="/game/characters">查看人物档案 <ArrowUpRight size={15} /></Link></div></section>
      <section className="scene-card"><NightGarden compact /><div><p className="eyebrow">SOMEWHERE IN SEOUL</p><p><MapPin size={14} />{gameState?.currentScene ?? "首尔汝矣岛电视台后门"}</p></div></section>
      <p className="margin-note">“你仍然有自己的生活，<br />他也仍然属于舞台。”<span>GARDEN · 故事的另一面</span></p>
      <p className="reference-note">开局保留原文模板，后两段为固定 UI 样例；暂未根据选择、身份或剧情节奏生成不同分支。</p>
    </aside>
  </div>;
}
