"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, MessageCircle, Globe2, UsersRound, FolderHeart } from "lucide-react";

const links = [
  { href: "/game", label: "剧情", icon: BookOpen },
  { href: "/game/messages", label: "消息", icon: MessageCircle },
  { href: "/game/sns", label: "SNS", icon: Globe2 },
  { href: "/game/characters", label: "人物", icon: UsersRound },
  { href: "/game/archive", label: "档案", icon: FolderHeart },
];

export function BottomNav() {
  const pathname = usePathname();
  return <nav className="bottom-nav" aria-label="游戏导航">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={pathname === href ? "active" : ""} aria-current={pathname === href ? "page" : undefined}><Icon size={20} strokeWidth={1.6} /><span>{label}</span>{pathname === href && <i />}</Link>)}</nav>;
}
