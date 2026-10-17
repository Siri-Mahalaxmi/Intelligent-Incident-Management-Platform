/**
 * apiClient — thin wrapper around fetch that automatically injects
 * the Supabase Bearer token from the current session.
 *
 * The Supabase client is created lazily on the first API call so it
 * is never instantiated during SSR or module evaluation — only when
 * an actual network request is made from the browser.
 */

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Lazy singleton — only created in the browser, never during SSR
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (typeof window === "undefined") return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  if (!_client) {
    _client = createBrowserClient(url, key);
  }
  return _client;
}

async function getAccessToken(): Promise<string | null> {
  try {
    const client = getClient();
    if (!client) return null;
    const { data: { session } } = await client.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> ?? {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (networkErr) {
    // Network error — backend is likely not running
    throw new Error(
      `Cannot reach the backend at ${API_BASE_URL}. ` +
      `Make sure the FastAPI server is running: ` +
      `cd backend && uvicorn app.main:app --reload`
    );
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.detail ?? `Request failed (${response.status})`
    );
  }

  return (await response.json()) as T;
}
