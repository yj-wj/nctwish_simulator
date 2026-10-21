import { Brand } from "./brand";

export function SiteHeader() {
  return <header className="site-header"><Brand /><span className="edition"><span className="status-dot" /> NCT WISH · 平行世界</span></header>;
}
