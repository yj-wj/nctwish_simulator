"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, MessageCircle, Globe2, UsersRound, FolderHeart } from "lucide-react";
import { useGameStore } from "@/store/game-store";

const links = [
  { href: "/game", label: "剧情", icon: BookOpen },
  { href: "/game/messages", label: "消息", icon: MessageCircle },
  { href: "/game/sns", label: "SNS", icon: Globe2 },
  { href: "/game/characters", label: "人物", icon: UsersRound },
  { href: "/game/archive", label: "档案", icon: FolderHeart },
];

export function BottomNav() {
  const pathname = usePathname();
  const unread = useGameStore((state) => state.chatThreads.reduce((sum, thread) => sum + thread.unreadCount, 0));
  const snsUnread = useGameStore((state) => state.snsPosts.filter(({ read }) => !read).length + state.snsTriggers.filter(({ status }) => status === "pending").length);
  return <nav className="bottom-nav" aria-label="游戏导航">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={pathname === href ? "active" : ""} aria-current={pathname === href ? "page" : undefined}><Icon size={20} strokeWidth={1.6} /><span>{label}</span>{href === "/game/messages" && unread > 0 && <b className="nav-unread" aria-label={`${unread} 条未读消息`}>{unread}</b>}{href === "/game/sns" && snsUnread > 0 && <b className="nav-unread" aria-label={`${snsUnread} 条 SNS 更新`}>{snsUnread}</b>}{pathname === href && <i />}</Link>)}</nav>;
}
