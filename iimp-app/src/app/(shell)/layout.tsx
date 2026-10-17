"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { IncidentsProvider } from "@/context/IncidentsContext";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();

  // Client-side auth guard — fires if proxy redirect didn't catch it
  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login");
    }
  }, [loading, session, router]);

  // Show spinner while auth state is being determined
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
          <p className="text-sm text-slate-400">Loading workspace…</p>
        </div>
      </div>
    );
  }

  // No session after loading — redirect is in flight, show spinner not blank
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <IncidentsProvider>
      <div className="min-h-screen bg-slate-50">
        <Sidebar />
        <div className="pl-56 min-h-screen">
          {children}
        </div>
      </div>
    </IncidentsProvider>
  );
}
