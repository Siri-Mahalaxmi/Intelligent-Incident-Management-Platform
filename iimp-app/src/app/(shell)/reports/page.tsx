"use client";

import { useIncidents } from "@/context/IncidentsContext";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import SeverityBadge from "@/components/SeverityBadge";

export default function ReportsPage() {
  const { incidents, loading } = useIncidents();
  const { profile } = useAuth();

  const withReports = incidents.filter((i) => i.report_result);

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar />
      <main className="px-6 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Post-Mortem Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            AI-generated incident reports{profile?.organization ? ` for ${profile.organization.name}` : ""}.
          </p>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white py-20 text-center shadow-sm">
            <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
            <p className="text-sm text-slate-400">Loading reports…</p>
          </div>
        ) : withReports.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
            <svg className="mx-auto mb-3 h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p className="text-sm text-slate-500 font-medium">No reports generated yet.</p>
            <p className="text-xs text-slate-400 mt-1">Run the full AI pipeline on an incident to generate a post-mortem report.</p>
            <Link href="/" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr className="bg-slate-50/80">
                  {["Incident", "Title", "Service", "Severity", "Report Summary", "Action"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {withReports.map((inc) => {
                  const report = inc.report_result as { executive_summary?: string } | null;
                  return (
                    <tr key={inc.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="whitespace-nowrap px-5 py-4">
                        <Link href={`/incidents/${inc.incident_id ?? inc.id}`}
                          className="font-mono text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                          {inc.incident_id ?? inc.id}
                        </Link>
                      </td>
                      <td className="px-5 py-4 max-w-[180px]">
                        <p className="text-sm font-medium text-slate-800 truncate" title={inc.title}>{inc.title}</p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">{inc.service}</td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <SeverityBadge severity={inc.severity} />
                      </td>
                      <td className="px-5 py-4 max-w-[240px]">
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {report?.executive_summary ?? "—"}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <Link
                          href={`/incidents/${inc.incident_id ?? inc.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                        >
                          View Report
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
