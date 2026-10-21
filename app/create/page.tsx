import { SetupShell } from "@/components/common/setup-shell";
import { PlayerForm } from "@/components/character/player-form";

export default function CreatePage() {
  return <SetupShell step={0} title="故事的主角，是你。" description="在遇见他之前，先写下属于自己的生活。" back="/"><PlayerForm /></SetupShell>;
}
