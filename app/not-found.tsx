import Link from "next/link";
import { SiteHeader } from "@/components/common/site-header";

export default function NotFound() {
  return <><SiteHeader /><main id="main-content" className="guard-message"><p className="eyebrow">PAGE NOT FOUND</p><h1>这一页，还没有写下。</h1><Link href="/" className="button primary">返回首页</Link></main></>;
}
