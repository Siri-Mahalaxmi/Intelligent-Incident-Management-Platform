"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface TopBarProps {
  /** Override the default search placeholder */
  searchPlaceholder?: string;
  /** Called when search is submitted */
  onSearch?: (query: string) => void;
  /** Extra actions to render on the right (e.g. "New Incident" button) */
  actions?: React.ReactNode;
}

export default function TopBar({
  searchPlaceholder = "Search incidents, services, keywords…",
  onSearch,
  actions,
}: TopBarProps) {
  const { profile } = useAuth();
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (onSearch) onSearch(query);
  }

  return (
    <header className="h-14 flex items-center gap-4 border-b border-slate-200 bg-white px-6 sticky top-0 z-20">

      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </form>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Extra actions */}
      {actions && <div className="flex items-center gap-2">{actions}</div>}

      {/* Organization badge */}
      {profile?.organization && (
        <div className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
          <span className="text-xs font-medium text-slate-600 truncate max-w-[120px]">
            {profile.organization.name}
          </span>
        </div>
      )}

      {/* User avatar */}
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase flex-shrink-0 cursor-default select-none">
        {(profile?.full_name ?? profile?.email ?? "U").charAt(0)}
      </div>
    </header>
  );
}
