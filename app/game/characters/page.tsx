import { WorldPeople } from "@/components/character/world-people";

export default function PeoplePage() {
  return <><div className="tab-heading"><p className="eyebrow">THE PEOPLE IN YOUR STORY</p><h1>人物</h1><p>来自统一 NPC Registry 与当前 World State，仅显示玩家已知信息。</p></div><WorldPeople /></>;
}
