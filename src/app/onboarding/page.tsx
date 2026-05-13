import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { completeOnboardingAction } from "@/server/actions/auth";
import { isProfileComplete, requireUserProfile } from "@/server/queries/auth";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const profile = await requireUserProfile();

  if (isProfileComplete(profile)) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--subtle)] p-4">
      <form
        action={completeOnboardingAction}
        className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm"
      >
        <p className="text-sm font-semibold text-[var(--accent-blue)]">Setup</p>
        <h1 className="mt-2 text-2xl font-bold">Set up your study workspace</h1>
        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold">Native language</span>
            <select
              name="nativeLanguage"
              defaultValue="Indonesian"
              className="mt-2 h-11 w-full rounded-lg border border-[var(--border)] px-3"
            >
              <option value="Indonesian">Indonesian</option>
              <option value="English">English</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Default review length</span>
            <select
              name="reviewDuration"
              defaultValue="30"
              className="mt-2 h-11 w-full rounded-lg border border-[var(--border)] px-3"
            >
              <option value="30">30 minutes</option>
              <option value="15">15 minutes</option>
              <option value="45">45 minutes</option>
            </select>
          </label>
        </div>
        <Button className="mt-6 w-full" type="submit">
          Start studying
        </Button>
      </form>
    </main>
  );
}
