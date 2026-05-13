import { AppSidebar } from "./app-sidebar";
import { RightPanel } from "./right-panel";

export async function AppShell({
  children,
  activeThreadId,
  showRightPanel = true,
}: {
  children: React.ReactNode;
  activeThreadId?: string;
  showRightPanel?: boolean;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="flex min-h-screen">
        <AppSidebar activeThreadId={activeThreadId} />
        <main className="min-w-0 flex-1">{children}</main>
        {showRightPanel ? <RightPanel activeThreadId={activeThreadId} /> : null}
      </div>
    </div>
  );
}
