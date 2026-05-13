import { AppShell } from "@/components/app-shell/app-shell";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <AppShell showRightPanel={false}>
      <main className="mx-auto max-w-3xl p-5">
        <h1 className="text-3xl font-bold">Settings</h1>
        <section className="mt-6 rounded-2xl border border-[var(--border)] bg-white p-5">
          <h2 className="text-lg font-bold">Global defaults</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label>
              <span className="text-sm font-semibold">Native language</span>
              <select className="mt-2 h-11 w-full rounded-lg border border-[var(--border)] px-3">
                <option>Indonesian</option>
              </select>
            </label>
            <label>
              <span className="text-sm font-semibold">Review duration</span>
              <select className="mt-2 h-11 w-full rounded-lg border border-[var(--border)] px-3">
                <option>30 minutes</option>
              </select>
            </label>
          </div>
          <Button className="mt-5">Save settings</Button>
        </section>
      </main>
    </AppShell>
  );
}
