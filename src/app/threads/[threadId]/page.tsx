import { AppShell } from "@/components/app-shell/app-shell";
import { ThreadWorkspace } from "@/components/study-thread/thread-workspace";
import { requireCompletedOnboarding } from "@/server/queries/auth";

export const dynamic = "force-dynamic";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  await requireCompletedOnboarding(`/threads/${threadId}`);

  return (
    <AppShell activeThreadId={threadId}>
      <ThreadWorkspace threadId={threadId} />
    </AppShell>
  );
}
