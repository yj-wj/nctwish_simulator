import { SetupShell } from "@/components/common/setup-shell";
import { RouteGuard } from "@/components/common/route-guard";
import { CharacterProfile } from "@/components/character/character-profile";

export default function CharacterCardPage() {
  return <RouteGuard stage="character"><SetupShell step={2} title="相遇之前，认识一下。" description="这是一份角色设定卡。真正的了解，从故事里的每一次互动开始。" back="/characters"><CharacterProfile /></SetupShell></RouteGuard>;
}
