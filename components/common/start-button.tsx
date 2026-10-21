"use client";

import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { useUIStore } from "@/store/ui-store";

export function StartButton() {
  const router = useRouter();
  const reset = useUIStore((state) => state.reset);
  return <button className="button primary start-button" onClick={() => { reset(); router.push("/create"); }}>开始游戏 <ArrowUpRight size={21} /></button>;
}
