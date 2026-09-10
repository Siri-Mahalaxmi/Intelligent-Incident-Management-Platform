"use client";

import { useState } from "react";
import Link from "next/link";
import { Severity, Status } from "@/types/incident";
import { useIncidents } from "@/context/IncidentsContext";
import SeverityBadge from "@/components/SeverityBadge";
import StatusBadge from "@/components/StatusBadge";
import CreateIncidentModal from "@/components/CreateIncidentModal";

const SEVERITY_ORDER: Record<Severity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------
function StatCard({
  label,
  value,
  icon,
  color,
  onClick,
  active,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-[140px] rounded-xl border p-4 text-left transition-all shadow-sm ${
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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const { incidents, loading } = useIncidents();
  const [filterSeverity, setFilterSeverity] = useState<Severity | "ALL">("ALL");
  const [filterStatus, setFilterStatus] = useState<Status | "ALL">("ALL");
  const [sortBySeverity, setSortBySeverity] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = incidents
    .filter((i) => filterSeverity === "ALL" ? true : i.severity === filterSeverity)
    .filter((i) => filterStatus === "ALL" ? true : i.status === filterStatus)
    .sort((a, b) =>
      sortBySeverity ? SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] : 0
    );

  const totalCount     = incidents.length;
  const openCount      = incidents.filter((i) => i.status === "OPEN").length;
  const criticalCount  = incidents.filter((i) => i.severity === "CRITICAL").length;
  const resolvedCount  = incidents.filter((i) => i.status === "RESOLVED").length;
  const inProgressCount = incidents.filter((i) => i.status === "IN_PROGRESS").length;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 shadow-sm">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-900 leading-tight">Incident Dashboard</h1>
              <p className="text-xs text-slate-400 leading-tight">
                Intelligent Incident Management Platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/metrics"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
              Metrics
            </Link>
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 active:scale-95 transition-all"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Incident
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* ---------------------------------------------------------------- */}
        {/* Stat cards — clickable to filter                                 */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex flex-wrap gap-3">
          <StatCard
            label="Total"
            value={loading ? 0 : totalCount}
            color="bg-slate-100"
            active={filterStatus === "ALL" && filterSeverity === "ALL"}
            onClick={() => { setFilterStatus("ALL"); setFilterSeverity("ALL"); }}
            icon={
              <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
              </svg>
            }
          />
          <StatCard
            label="Open"
            value={loading ? 0 : openCount}
            color="bg-blue-100"
            active={filterStatus === "OPEN"}
            onClick={() => { setFilterStatus("OPEN"); setFilterSeverity("ALL"); }}
            icon={
              <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            }
          />
          <StatCard
            label="In Progress"
            value={loading ? 0 : inProgressCount}
            color="bg-violet-100"
            active={filterStatus === "IN_PROGRESS"}
            onClick={() => { setFilterStatus("IN_PROGRESS"); setFilterSeverity("ALL"); }}
            icon={
              <svg className="h-4 w-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            }
          />
          <StatCard
            label="Critical"
            value={loading ? 0 : criticalCount}
            color="bg-red-100"
            active={filterSeverity === "CRITICAL"}
            onClick={() => { setFilterSeverity("CRITICAL"); setFilterStatus("ALL"); }}
            icon={
              <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
              </svg>
            }
          />
          <StatCard
            label="Resolved"
            value={loading ? 0 : resolvedCount}
            color="bg-emerald-100"
            active={filterStatus === "RESOLVED"}
            onClick={() => { setFilterStatus("RESOLVED"); setFilterSeverity("ALL"); }}
            icon={
              <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Filters bar                                                      */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <label htmlFor="severity-filter" className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Severity
            </label>
            <select
              id="severity-filter"
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as Severity | "ALL")}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            >
              <option value="ALL">All</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="status-filter" className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Status
            </label>
            <select
              id="status-filter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as Status | "ALL")}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            >
              <option value="ALL">All</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>

          <button
            onClick={() => setSortBySeverity((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              sortBySeverity
                ? "border-indigo-300 bg-indigo-50 text-indigo-700 shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M7 12h10M11 17h2" />
            </svg>
            {sortBySeverity ? "Sorted by Severity" : "Sort by Severity"}
          </button>

          {(filterSeverity !== "ALL" || filterStatus !== "ALL") && (
            <button
              onClick={() => { setFilterSeverity("ALL"); setFilterStatus("ALL"); }}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors underline underline-offset-2"
            >
              Clear filters
            </button>
          )}

          <span className="ml-auto text-xs text-slate-400">
            {loading ? "" : `${filtered.length} incident${filtered.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Table                                                            */}
        {/* ---------------------------------------------------------------- */}
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
              onClick={() => { setFilterSeverity("ALL"); setFilterStatus("ALL"); }}
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
                  {["ID", "Title", "Service", "Severity", "Status", "Created"].map((h) => (
                    <th key={h} scope="col" className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filtered.map((incident) => (
                  <tr key={incident.id} className="group hover:bg-indigo-50/40 transition-colors cursor-pointer">
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <Link
                        href={`/incidents/${incident.incident_id ?? incident.id}`}
                        className="font-mono text-xs font-semibold text-indigo-600 hover:text-indigo-800 group-hover:underline"
                      >
                        {incident.incident_id ?? incident.id}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 max-w-xs">
                      <Link
                        href={`/incidents/${incident.incident_id ?? incident.id}`}
                        className="block text-sm font-medium text-slate-800 hover:text-indigo-600 truncate"
                        title={incident.title}
                      >
                        {incident.title}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-sm text-slate-500">
                      {incident.service}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <SeverityBadge severity={incident.severity} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <StatusBadge status={incident.status} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs text-slate-400">
                      {formatDate(incident.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <CreateIncidentModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
