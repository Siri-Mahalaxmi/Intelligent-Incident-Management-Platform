"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Incident, Severity, Status } from "@/types/incident";
import { seedIncidents } from "@/data/seedIncidents";
import SeverityBadge from "@/components/SeverityBadge";
import StatusBadge from "@/components/StatusBadge";

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

export default function DashboardPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<Severity | "ALL">("ALL");
  const [filterStatus, setFilterStatus] = useState<Status | "ALL">("ALL");
  const [sortBySeverity, setSortBySeverity] = useState(false);

  useEffect(() => {
    // Simulate a minimal async load so the loading state is visible
    const timer = setTimeout(() => {
      setIncidents(seedIncidents);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const filtered = incidents
    .filter((i) =>
      filterSeverity === "ALL" ? true : i.severity === filterSeverity
    )
    .filter((i) => (filterStatus === "ALL" ? true : i.status === filterStatus))
    .sort((a, b) =>
      sortBySeverity
        ? SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
        : 0
    );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Incident Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {loading
                ? "Loading…"
                : `${incidents.length} incident${incidents.length !== 1 ? "s" : ""} total`}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6 items-center">
          <div className="flex items-center gap-2">
            <label
              htmlFor="severity-filter"
              className="text-sm font-medium text-gray-700"
            >
              Severity
            </label>
            <select
              id="severity-filter"
              value={filterSeverity}
              onChange={(e) =>
                setFilterSeverity(e.target.value as Severity | "ALL")
              }
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="status-filter"
              className="text-sm font-medium text-gray-700"
            >
              Status
            </label>
            <select
              id="status-filter"
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as Status | "ALL")
              }
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>

          <button
            onClick={() => setSortBySeverity((v) => !v)}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              sortBySeverity
                ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {sortBySeverity ? "Sorted by Severity ✓" : "Sort by Severity"}
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="rounded-lg border border-gray-200 bg-white py-16 text-center">
            <p className="text-sm text-gray-400">Loading incidents…</p>
          </div>
        ) : incidents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white py-16 text-center">
            <p className="text-sm text-gray-500">No incidents found.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white py-16 text-center">
            <p className="text-sm text-gray-500">
              No incidents match the current filters.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    ID
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Title
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Service
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Severity
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filtered.map((incident) => (
                  <tr
                    key={incident.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <Link
                        href={`/incidents/${incident.id}`}
                        className="text-sm font-mono font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        {incident.id}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/incidents/${incident.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-indigo-600"
                      >
                        {incident.title}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {incident.service}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <SeverityBadge severity={incident.severity} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <StatusBadge status={incident.status} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatDate(incident.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
