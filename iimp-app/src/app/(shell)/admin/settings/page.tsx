"use client";

import TopBar from "@/components/TopBar";
import Link from "next/link";

export default function AdminSettingsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar />

      <main className="px-6 py-6 space-y-6 max-w-2xl">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Platform Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Central administration configuration.
          </p>
        </div>

        {/* Platform info */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Platform
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              ["Product",  "IIMP — Intelligent Incident Management Platform"],
              ["Version",  "2.0.0"],
              ["Mode",     "Multi-Tenant"],
              ["Auth",     "Supabase Auth"],
              ["Database", "Supabase PostgreSQL + pgvector"],
              ["AI",       "Google Gemini (multi-agent pipeline)"],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">
                  {label}
                </p>
                <p className="text-slate-700">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Quick Links
          </h2>
          <div className="space-y-2 text-sm">
            {[
              { label: "Manage Organizations",   href: "/admin" },
              { label: "All Incidents",          href: "/admin/incidents" },
              { label: "All Reports",            href: "/admin/reports" },
              { label: "Evaluation Metrics",     href: "/metrics" },
            ].map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 hover:border-indigo-200 hover:bg-indigo-50 transition-colors group"
              >
                <span className="text-slate-700 group-hover:text-indigo-700 font-medium">
                  {label}
                </span>
                <svg
                  className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Database schema changes and environment configuration are managed
          outside the application. See the migration files in{" "}
          <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">
            backend/migrations/
          </code>
          .
        </p>
      </main>
    </div>
  );
}
