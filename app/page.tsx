import { ArrowDown, Flower2 } from "lucide-react";
import { SiteHeader } from "@/components/common/site-header";
import { NightGarden } from "@/components/common/night-garden";
import { StartButton } from "@/components/common/start-button";

export default function HomePage() {
  return <><SiteHeader /><main id="main-content" className="landing"><div className="landing-hero"><section className="hero-copy"><p className="eyebrow"><span /> A PARALLEL WORLD, A PERSONAL STORY</p><div className="hero-edition">NCT WISH 定向版 <span>VOL. 01</span></div><h1>在人海之外，<br />让故事<span className="hero-title-accent">慢慢生长。<svg viewBox="0 0 360 20" aria-hidden="true"><path d="M3 13 Q180 -5 354 10 M20 18 Q180 4 330 17" /></svg></span></h1><p className="hero-description">舞台上的他，生活里的你。<br />从一次偶然的相遇开始，在心动与现实之间，<br className="desktop-break" />写下一段只属于你的平行世界故事。</p><StartButton /><p className="hero-hint">六位男主 · 多种身份 · 你的每一种可能</p><div className="hero-signature"><Flower2 size={25} strokeWidth={1} /><span>七分甜，三分现实。<small>A LITTLE SWEETNESS. A LITTLE REALITY.</small></span></div></section><div className="hero-art"><div className="art-stamp">a story<br /><em>for you.</em><span>✧</span></div><NightGarden /><div className="art-bottom"><span>01 / 初遇之前</span><span>THE GARDEN OF OUR DAYS</span></div><div className="art-label">世界很大，<br />而相遇很小。</div></div></div>
    <div className="landing-foot"><div><ArrowDown size={16} /><span>从你的生活，走进故事</span></div><p>平行世界虚构作品，不代表现实人物经历或真实性格。<br />所有亲密关系角色均为成年人。当前为界面样例预览。</p><span className="phase-label">PHASE 01<br /><b>UI PREVIEW</b></span></div>
  </main></>;
}
