/**
 * Browser-side Supabase client.
 * Use this in Client Components ("use client") and browser event handlers.
 * Uses the anon key — safe to expose to the browser.
 */
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
