import { AppShell } from "@/components/app-shell/app-shell";
import { NewStudyComposer } from "@/components/composer/new-study-composer";
import { requireCompletedOnboarding } from "@/server/queries/auth";

export const dynamic = "force-dynamic";

export default async function NewThreadPage() {
  await requireCompletedOnboarding("/threads/new");

  return (
    <AppShell>
      <div className="flex min-h-screen items-center px-5 py-10">
        <NewStudyComposer />
      </div>
    </AppShell>
  );
}
