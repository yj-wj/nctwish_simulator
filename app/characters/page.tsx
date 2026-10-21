import { SetupShell } from "@/components/common/setup-shell";
import { RouteGuard } from "@/components/common/route-guard";
import { CharacterSelection } from "@/components/character/character-selection";

export default function CharactersPage() {
  return <RouteGuard stage="player"><SetupShell step={1} title="这一次，你会遇见谁？" description="舞台之外，每个人都有不一样的故事。" back="/create"><CharacterSelection /></SetupShell></RouteGuard>;
}
