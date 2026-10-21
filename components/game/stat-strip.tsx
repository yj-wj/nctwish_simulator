import { Heart, Sparkles, Smile, Wallet, ShieldCheck, Eye, Activity } from "lucide-react";
import { previewStats } from "@/mocks/story";

const icons = { affection: Heart, popularity: Sparkles, mood: Smile, money: Wallet, secrecy: ShieldCheck, companyAlert: Eye, careerPressure: Activity };

export function StatStrip() {
  return <section className="stat-strip" aria-label="七项状态（固定样例）">{previewStats.map((stat) => {
    const Icon = icons[stat.id];
    return <div className={`stat-item stat-${stat.id}`} key={stat.id}><span className="stat-label"><Icon size={14} />{stat.label}</span><strong>{stat.value.toLocaleString("en-US")}<small>{stat.id !== "money" ? "/ 100" : ""}</small></strong>{stat.id !== "money" && <div className="stat-track" aria-hidden="true"><span style={{ width: `${stat.value}%` }} /></div>}</div>;
  })}</section>;
}
