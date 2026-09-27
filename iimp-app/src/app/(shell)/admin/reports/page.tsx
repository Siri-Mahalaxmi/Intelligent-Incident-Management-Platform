"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import SeverityBadge from "@/components/SeverityBadge";
import { getAllIncidents, getOrganizations, type OrgSummary } from "@/services/adminService";
import type { Incident } from "@/types/incident";

export default function AdminReportsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [orgs, setOrgs]           = useState<OrgSummary[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([getAllIncidents(), getOrganizations()])
      .then(([i, o]) => { setIncidents(i); setOrgs(o); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const withReports = incidents.filter((i) => i.report_result);

  function orgName(inc: Incident) {
    const oid = (inc as Incident & { organization_id?: string }).organization_id;
    return orgs.find((o) => o.id === oid)?.name ?? "—";
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar />
      <main className="px-6 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">All AI-generated post-mortem reports across all organizations.</p>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white py-20 text-center shadow-sm">
            <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="px-5 py-3 border-b border-slate-100 text-xs text-slate-500">
              {withReports.length} report{withReports.length !== 1 ? "s" : ""} generated
            </div>
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr className="bg-slate-50/80">
                  {["Incident", "Organization", "Title", "Severity", "Summary", "Action"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
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
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">{orgName(inc)}</td>
                      <td className="px-5 py-4 max-w-[160px]">
                        <p className="text-sm font-medium text-slate-800 truncate">{inc.title}</p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4"><SeverityBadge severity={inc.severity} /></td>
                      <td className="px-5 py-4 max-w-[200px]">
                        <p className="text-xs text-slate-500 line-clamp-2">{report?.executive_summary ?? "—"}</p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <Link href={`/incidents/${inc.incident_id ?? inc.id}`}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline">
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {withReports.length === 0 && (
                  <tr><td colSpan={6} className="py-16 text-center text-sm text-slate-400">No reports generated yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
