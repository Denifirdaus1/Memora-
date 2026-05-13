import { AppShell } from "@/components/app-shell/app-shell";
import { FlashcardsBoard } from "@/components/flashcards/flashcards-board";

export default function FlashcardsPage() {
  return (
    <AppShell showRightPanel={false}>
      <FlashcardsBoard />
    </AppShell>
  );
}
