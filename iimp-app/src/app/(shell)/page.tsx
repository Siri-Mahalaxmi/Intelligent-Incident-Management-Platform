"use client";

import { useState } from "react";
import Link from "next/link";
import { Severity, Status } from "@/types/incident";
import { useIncidents } from "@/context/IncidentsContext";
import { useAuth } from "@/context/AuthContext";
import SeverityBadge from "@/components/SeverityBadge";
import StatusBadge from "@/components/StatusBadge";
import CreateIncidentModal from "@/components/CreateIncidentModal";
import TopBar from "@/components/TopBar";

const SEVERITY_ORDER: Record<Severity, number> = {
  CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function StatCard({
  label, value, icon, color, onClick, active,
}: {
  label: string; value: number; icon: React.ReactNode;
  color: string; onClick?: () => void; active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-[130px] rounded-xl border p-4 text-left transition-all shadow-sm ${
        active
          ? "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-semibold uppercase tracking-wide ${active ? "text-indigo-600" : "text-slate-400"}`}>
          {label}
        </span>
        <span className={`h-7 w-7 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </span>
      </div>
      <p className={`text-3xl font-bold tabular-nums ${active ? "text-indigo-700" : "text-slate-800"}`}>
        {value}
      </p>
    </button>
  );
}

// Recent activity derived from incidents
function RecentActivity({ incidents }: { incidents: ReturnType<typeof useIncidents>["incidents"] }) {
  const recent = incidents.slice(0, 5);
  if (!recent.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Recent Activity</h2>
        <Link href="/incidents" className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors">
          View all
        </Link>
      </div>
      <div className="space-y-3">
        {recent.map((inc) => (
          <div key={inc.id} className="flex items-start gap-3">
            <div className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${
              inc.severity === "CRITICAL" ? "bg-red-500" :
              inc.severity === "HIGH" ? "bg-orange-500" :
              inc.severity === "MEDIUM" ? "bg-amber-500" : "bg-emerald-500"
            }`} />
            <div className="min-w-0 flex-1">
              <Link
                href={`/incidents/${inc.incident_id ?? inc.id}`}
                className="text-sm font-medium text-slate-800 hover:text-indigo-600 truncate block transition-colors"
              >
                {inc.title}
              </Link>
              <p className="text-xs text-slate-400 mt-0.5">{inc.service} · {formatDate(inc.created_at)}</p>
            </div>
            <StatusBadge status={inc.status} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Severity distribution donut-style chart (pure CSS)
function SeverityChart({ incidents }: { incidents: ReturnType<typeof useIncidents>["incidents"] }) {
  const total = incidents.length;
  if (!total) return null;

  const counts = {
    CRITICAL: incidents.filter((i) => i.severity === "CRITICAL").length,
    HIGH: incidents.filter((i) => i.severity === "HIGH").length,
    MEDIUM: incidents.filter((i) => i.severity === "MEDIUM").length,
    LOW: incidents.filter((i) => i.severity === "LOW").length,
  };

  const bars: { label: string; count: number; color: string }[] = [
    { label: "Critical", count: counts.CRITICAL, color: "bg-red-500" },
    { label: "High",     count: counts.HIGH,     color: "bg-orange-500" },
    { label: "Medium",   count: counts.MEDIUM,   color: "bg-amber-500" },
    { label: "Low",      count: counts.LOW,       color: "bg-emerald-500" },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
      <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
        Incidents by Severity
      </h2>
      <div className="space-y-3">
        {bars.map((b) => (
          <div key={b.label} className="flex items-center gap-3">
            <span className="text-xs text-slate-500 w-12 flex-shrink-0">{b.label}</span>
            <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-2.5 rounded-full ${b.color} transition-all duration-500`}
                style={{ width: total ? `${(b.count / total) * 100}%` : "0%" }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-700 w-5 text-right tabular-nums">
              {b.count}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400 mt-3 text-right">{total} total</p>
    </div>
  );
}

export default function DashboardPage() {
  const { incidents, loading } = useIncidents();
  const { profile } = useAuth();
  const [filterSeverity, setFilterSeverity] = useState<Severity | "ALL">("ALL");
  const [filterStatus, setFilterStatus]     = useState<Status | "ALL">("ALL");
  const [filterService, setFilterService]   = useState("ALL");
  const [searchQuery, setSearchQuery]       = useState("");
  const [sortBySeverity, setSortBySeverity] = useState(false);
  const [modalOpen, setModalOpen]           = useState(false);

  // Derive unique services
  const services = Array.from(new Set(incidents.map((i) => i.service))).sort();

  const filtered = incidents
    .filter((i) => filterSeverity === "ALL" ? true : i.severity === filterSeverity)
    .filter((i) => filterStatus   === "ALL" ? true : i.status   === filterStatus)
    .filter((i) => filterService  === "ALL" ? true : i.service  === filterService)
    .filter((i) =>
      !searchQuery
        ? true
        : `${i.title} ${i.service} ${i.incident_id}`.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) =>
      sortBySeverity ? SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] : 0
    );

  const counts = {
    total:      incidents.length,
    open:       incidents.filter((i) => i.status === "OPEN").length,
    inProgress: incidents.filter((i) => i.status === "IN_PROGRESS").length,
    critical:   incidents.filter((i) => i.severity === "CRITICAL").length,
    resolved:   incidents.filter((i) => i.status === "RESOLVED").length,
    analyzed:   incidents.filter((i) => i.ai_summary).length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar
        searchPlaceholder="Search incidents, services, keywords…"
        onSearch={setSearchQuery}
        actions={
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 active:scale-95 transition-all"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Incident
          </button>
        }
      />

      <main className="px-6 py-6 space-y-6">

        {/* Page title */}
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Incident Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitor and manage incidents
            {profile?.organization ? ` for ${profile.organization.name}` : ""}.
          </p>
        </div>

        {/* Stat cards */}
        <div className="flex flex-wrap gap-3">
          {[
            {
              label: "Total Incidents", value: counts.total, color: "bg-slate-100",
              icon: <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>,
              active: filterStatus === "ALL" && filterSeverity === "ALL",
              onClick: () => { setFilterStatus("ALL"); setFilterSeverity("ALL"); },
            },
            {
              label: "Open", value: counts.open, color: "bg-blue-100",
              icon: <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>,
              active: filterStatus === "OPEN",
              onClick: () => { setFilterStatus("OPEN"); setFilterSeverity("ALL"); },
            },
            {
              label: "In Progress", value: counts.inProgress, color: "bg-violet-100",
              icon: <svg className="h-4 w-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>,
              active: filterStatus === "IN_PROGRESS",
              onClick: () => { setFilterStatus("IN_PROGRESS"); setFilterSeverity("ALL"); },
            },
            {
              label: "Critical", value: counts.critical, color: "bg-red-100",
              icon: <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" /></svg>,
              active: filterSeverity === "CRITICAL",
              onClick: () => { setFilterSeverity("CRITICAL"); setFilterStatus("ALL"); },
            },
            {
              label: "Resolved", value: counts.resolved, color: "bg-emerald-100",
              icon: <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
              active: filterStatus === "RESOLVED",
              onClick: () => { setFilterStatus("RESOLVED"); setFilterSeverity("ALL"); },
            },
          ].map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
          {(
            [
              { id: "severity", label: "Severity", value: filterSeverity, setter: setFilterSeverity,
                options: [["ALL","All"],["CRITICAL","Critical"],["HIGH","High"],["MEDIUM","Medium"],["LOW","Low"]] },
              { id: "status", label: "Status", value: filterStatus, setter: setFilterStatus,
                options: [["ALL","All"],["OPEN","Open"],["IN_PROGRESS","In Progress"],["RESOLVED","Resolved"]] },
            ] as const
          ).map(({ id, label, value, setter, options }) => (
            <div key={id} className="flex items-center gap-2">
              <label htmlFor={id} className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</label>
              <select
                id={id}
                value={value}
                onChange={(e) => setter(e.target.value as never)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          ))}

          {/* Service filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="service" className="text-xs font-medium text-slate-500 uppercase tracking-wide">Service</label>
            <select
              id="service"
              value={filterService}
              onChange={(e) => setFilterService(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All</option>
              {services.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <button
            onClick={() => setSortBySeverity((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
              sortBySeverity
                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Sort by Severity
          </button>

          {(filterSeverity !== "ALL" || filterStatus !== "ALL" || filterService !== "ALL") && (
            <button
              onClick={() => { setFilterSeverity("ALL"); setFilterStatus("ALL"); setFilterService("ALL"); }}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors underline underline-offset-2"
            >
              Clear filters
            </button>
          )}

          <span className="ml-auto text-xs text-slate-400">
            {loading ? "" : `${filtered.length} incident${filtered.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Table — spans 2 cols */}
          <div className="xl:col-span-2">
            {loading ? (
              <div className="rounded-xl border border-slate-200 bg-white py-20 text-center shadow-sm">
                <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                <p className="text-sm text-slate-400">Loading incidents…</p>
              </div>
            ) : incidents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
                <p className="text-sm text-slate-500">No incidents found.</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
                <p className="text-sm text-slate-500">No incidents match the current filters.</p>
                <button
                  onClick={() => { setFilterSeverity("ALL"); setFilterStatus("ALL"); setFilterService("ALL"); }}
                  className="mt-3 text-sm text-indigo-600 hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead>
                    <tr className="bg-slate-50/80">
                      {["ID", "Title", "Service", "Severity", "Status", "AI Analysis", "Created"].map((h) => (
                        <th key={h} scope="col"
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filtered.map((incident) => (
                      <tr key={incident.id} className="group hover:bg-indigo-50/40 transition-colors cursor-pointer">
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <Link
                            href={`/incidents/${incident.incident_id ?? incident.id}`}
                            className="font-mono text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                          >
                            {incident.incident_id ?? incident.id}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 max-w-[200px]">
                          <Link
                            href={`/incidents/${incident.incident_id ?? incident.id}`}
                            className="block text-sm font-medium text-slate-800 hover:text-indigo-600 truncate"
                            title={incident.title}
                          >
                            {incident.title}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-sm text-slate-500">
                          {incident.service}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <SeverityBadge severity={incident.severity} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <StatusBadge status={incident.status} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          {incident.ai_summary ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Analyzed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-400">
                          {formatDate(incident.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right sidebar widgets */}
          <div className="space-y-4">
            <RecentActivity incidents={incidents} />
            <SeverityChart incidents={incidents} />
          </div>
        </div>
      </main>

      <CreateIncidentModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
