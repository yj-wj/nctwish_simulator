import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { SiteHeader } from "./site-header";

const steps = ["写下你的故事", "选择相遇的人", "确认角色卡"];

export function SetupShell({ step, title, description, back, children }: { step: number; title: string; description: string; back: string; children: ReactNode }) {
  return <><SiteHeader /><main id="main-content" className="setup-shell">
    <Link href={back} className="back-link"><ArrowLeft size={16} /> 返回</Link>
    <ol className="steps" aria-label="角色创建进度">{steps.map((label, index) => <li key={label} className={index === step ? "active" : index < step ? "complete" : ""} aria-current={index === step ? "step" : undefined}><span>{index < step ? <Check size={14} /> : `0${index + 1}`}</span><small>{label}</small></li>)}</ol>
    <div className="section-heading"><p className="eyebrow">YOUR STORY BEGINS HERE</p><h1>{title}</h1><p>{description}</p></div>
    {children}
    <p className="setup-note">所有角色均为成年人 · 平行世界虚构设定 · Phase 2 Config &amp; Game State</p>
  </main></>;
}
