import Link from "next/link";
import { Flower2 } from "lucide-react";

export function Brand() {
  return <Link href="/" className="brand" aria-label="Garden 首页"><Flower2 size={27} strokeWidth={1.4} /><span>garden<span className="brand-dot">.</span></span><small>心动有迹可循</small></Link>;
}
