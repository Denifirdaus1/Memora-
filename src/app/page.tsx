import { ArrowRight, FileText, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { signInWithGoogleAction } from "@/server/actions/auth";

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ auth_error?: string; code?: string; next?: string }>;
}) {
  const params = await searchParams;
  const next = params?.next ?? "/dashboard";

  if (params?.code) {
    redirect(
      `/auth/callback?${new URLSearchParams({ code: params.code, next }).toString()}`,
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-xl font-bold text-[var(--foreground)]">
          Memora
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--subtle)]"
        >
          Open app
        </Link>
      </nav>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1fr_420px] lg:items-center">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#EAF2FF] px-3 py-1 text-sm font-semibold text-[var(--accent-blue)]">
            <Sparkles size={16} />
            AI study workspace
          </p>
          <h1 className="max-w-3xl text-5xl font-bold leading-tight text-[var(--foreground)]">
            Belajar dari materi kamu sendiri, bukan dari konten generik.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted)]">
            Upload PDF atau gambar halaman buku, biarkan AI mengekstrak materi, lalu
            lanjut belajar di study thread yang punya review, flashcards, dan memori.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <form action={signInWithGoogleAction}>
              <input type="hidden" name="next" value={next} />
              <Button size="lg" className="w-full sm:w-auto">
                Continue with Google
                <ArrowRight size={18} />
              </Button>
            </form>
            <Link
              href="/onboarding"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-[var(--border)] px-5 text-sm font-bold hover:bg-[var(--subtle)]"
            >
              View onboarding
            </Link>
          </div>
          {params?.auth_error ? (
            <p className="mt-4 text-sm font-semibold text-[var(--danger)]">
              Sign in failed. Check Supabase Google OAuth settings and try again.
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-sm">
          <div className="rounded-xl bg-white p-4">
            <div className="mb-4 flex items-center gap-2 text-sm font-bold">
              <FileText size={16} />
              Kapitel 3 - Berufe
            </div>
            <div className="space-y-3">
              <Feature
                icon={<ShieldCheck size={16} />}
                text="Temporary file processing"
              />
              <Feature
                icon={<Sparkles size={16} />}
                text="24 vocabulary items extracted"
              />
              <Feature icon={<ArrowRight size={16} />} text="Ready for varied review" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3 text-sm font-semibold">
      <span className="text-[var(--accent-blue)]">{icon}</span>
      {text}
    </div>
  );
}
