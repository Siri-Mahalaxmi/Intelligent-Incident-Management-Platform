"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import SeverityBadge from "@/components/SeverityBadge";
import StatusBadge from "@/components/StatusBadge";
import { getAllIncidents, getOrganizations, type OrgSummary } from "@/services/adminService";
import type { Incident } from "@/types/incident";

export default function AdminIncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [orgs, setOrgs]           = useState<OrgSummary[]>([]);
  const [filterOrg, setFilterOrg] = useState("ALL");
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([getAllIncidents(), getOrganizations()])
      .then(([i, o]) => { setIncidents(i); setOrgs(o); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filterOrg === "ALL"
    ? incidents
    : incidents.filter((i) => (i as Incident & { organization_id?: string }).organization_id === filterOrg);

  function orgName(inc: Incident) {
    const oid = (inc as Incident & { organization_id?: string }).organization_id;
    return orgs.find((o) => o.id === oid)?.name ?? "—";
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar />
      <main className="px-6 py-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">All Incidents</h1>
            <p className="text-sm text-slate-500 mt-0.5">View incidents across all organizations.</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Organization</label>
            <select
              value={filterOrg}
              onChange={(e) => setFilterOrg(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Organizations</option>
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white py-20 text-center shadow-sm">
            <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
            <p className="text-sm text-slate-400">Loading incidents…</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr className="bg-slate-50/80">
                  {["ID", "Title", "Organization", "Service", "Severity", "Status", "AI Analysis", "Created"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filtered.map((inc) => (
                  <tr key={inc.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <Link href={`/incidents/${inc.incident_id ?? inc.id}`}
                        className="font-mono text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                        {inc.incident_id ?? inc.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 max-w-[160px]">
                      <p className="text-sm font-medium text-slate-800 truncate">{inc.title}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-500">{orgName(inc)}</td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-sm text-slate-500">{inc.service}</td>
                    <td className="whitespace-nowrap px-4 py-3.5"><SeverityBadge severity={inc.severity} /></td>
                    <td className="whitespace-nowrap px-4 py-3.5"><StatusBadge status={inc.status} /></td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      {inc.ai_summary ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Analyzed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />Pending
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-400">
                      {new Date(inc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="py-16 text-center text-sm text-slate-400">No incidents found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
