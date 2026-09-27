"use client";

/**
 * AuthContext — provides Supabase session, user profile, and auth actions
 * (login, logout) to all Client Components.
 *
 * Profile is fetched from GET /me on the FastAPI backend so it includes
 * the organization and role data we store in the profiles table.
 *
 * The Supabase client is created lazily via useRef so it is never
 * instantiated during SSR / static generation (where env vars may be
 * placeholder strings). createClient() runs only in the browser.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { SupabaseClient, Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/types/auth";

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Lazy ref — createClient() is only called once, in the browser.
  // During SSR the ref stays null and the useEffect never runs (effects
  // are browser-only), so no URL validation happens server-side.
  const supabaseRef = useRef<SupabaseClient | null>(null);

  function getSupabase(): SupabaseClient {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient();
    }
    return supabaseRef.current;
  }

  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch application profile from the FastAPI /me endpoint
  const fetchProfile = useCallback(async (accessToken: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/me`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) { setProfile(null); return; }
      const data: UserProfile = await res.json();
      setProfile(data);
    } catch {
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.access_token) {
      await fetchProfile(session.access_token);
    }
  }, [session, fetchProfile]);

  // Bootstrap: runs only in the browser (useEffect is client-only)
  useEffect(() => {
    const supabase = getSupabase();

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.access_token) await fetchProfile(s.access_token);
      setLoading(false);
    });

    // Keep session in sync across tabs / token refreshes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.access_token) {
          await fetchProfile(s.access_token);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      const { error } = await getSupabase().auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      return { error: null };
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
    setProfile(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider
      value={{ session, user, profile, loading, signIn, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
