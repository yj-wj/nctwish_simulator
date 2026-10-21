import { Heart, Sparkles, Smile, Wallet, ShieldCheck, Eye, Activity } from "lucide-react";
import type { GameStats, StatId } from "@/types/game";

const icons = { affection: Heart, popularity: Sparkles, mood: Smile, money: Wallet, secrecy: ShieldCheck, companyAlert: Eye, careerPressure: Activity };
const labels: Record<StatId, string> = { affection: "好感度", popularity: "人气值", mood: "心情值", money: "金钱", secrecy: "恋情保密度", companyAlert: "公司警觉度", careerPressure: "事业压力" };
const statIds = Object.keys(labels) as StatId[];

export function StatStrip({ stats }: { stats: GameStats }) {
  return <section className="stat-strip" aria-label="七项核心状态">{statIds.map((id) => {
    const Icon = icons[id];
    const value = stats[id];
    return <div className={`stat-item stat-${id}`} key={id}><span className="stat-label"><Icon size={14} />{labels[id]}</span><strong>{value.toLocaleString("en-US")}<small>{id !== "money" ? "/ 100" : ""}</small></strong>{id !== "money" && <div className="stat-track" aria-hidden="true"><span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>}</div>;
  })}</section>;
}
