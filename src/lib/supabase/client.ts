import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublishableKey, requireEnv } from "@/lib/env";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getSupabasePublishableKey(),
  );
}
