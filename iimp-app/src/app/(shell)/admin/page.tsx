"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import { getOrganizations, getPlatformStats, createOrganization, type OrgSummary, type PlatformStats } from "@/services/adminService";

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm p-5 border-l-4 ${color}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">{label}</p>
      <p className="text-3xl font-bold tabular-nums text-slate-800">{value}</p>
    </div>
  );
}

export default function AdminOrgsPage() {
  const [orgs, setOrgs]       = useState<OrgSummary[]>([]);
  const [stats, setStats]     = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");

  // New org modal state
  const [showModal, setShowModal]   = useState(false);
  const [newName, setNewName]       = useState("");
  const [newDomain, setNewDomain]   = useState("");
  const [creating, setCreating]     = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getOrganizations(), getPlatformStats()])
      .then(([o, s]) => { setOrgs(o); setStats(s); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = orgs.filter((o) =>
    !search
      ? true
      : `${o.name} ${o.domain ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || creating) return;
    setCreating(true); setCreateError(null);
    try {
      const created = await createOrganization(newName.trim(), newDomain.trim() || undefined);
      setOrgs((prev) => [{ ...created, user_count: 0, incident_count: 0 }, ...prev]);
      setShowModal(false); setNewName(""); setNewDomain("");
      if (stats) setStats({ ...stats, total_organizations: stats.total_organizations + 1 });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create organization.");
    } finally { setCreating(false); }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar
        searchPlaceholder="Search organizations…"
        onSearch={setSearch}
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 active:scale-95 transition-all"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Organization
          </button>
        }
      />

      <main className="px-6 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Organizations</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage organizations and monitor overall platform health.</p>
        </div>

        {/* Platform stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Organizations" value={stats.total_organizations}  color="border-indigo-500" />
            <StatCard label="Total Incidents"     value={stats.total_incidents}      color="border-rose-500" />
            <StatCard label="Active Users"        value={stats.total_users}          color="border-emerald-500" />
            <StatCard label="Active Orgs"         value={stats.active_organizations} color="border-amber-500" />
          </div>
        )}

        {/* Orgs table */}
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white py-20 text-center shadow-sm">
            <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
            <p className="text-sm text-slate-400">Loading organizations…</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr className="bg-slate-50/80">
                  {["Organization", "Domain", "Users", "Incidents", "Status", "Created", ""].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filtered.map((org) => (
                  <tr key={org.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0 uppercase">
                          {org.name.charAt(0)}
                        </div>
                        <span className="text-sm font-semibold text-slate-900">{org.name}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">{org.domain ?? "—"}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700 font-medium">{org.user_count} users</td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700 font-medium">{org.incident_count} incidents</td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                        org.status === "active"
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-slate-100 text-slate-500 ring-slate-200"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${org.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`} />
                        {org.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-400">
                      {new Date(org.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <Link
                        href={`/admin/organizations/${org.id}`}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-sm text-slate-400">
                      No organizations found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Create org modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">New Organization</h2>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateOrg} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Organization Name <span className="text-red-500">*</span></label>
                <input
                  required value={newName} onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Domain <span className="text-slate-400 text-xs">(optional)</span></label>
                <input
                  value={newDomain} onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="e.g. acmecorp.com"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {createError && <p className="text-sm text-red-600">{createError}</p>}
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={creating}
                  className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-70">
                  {creating ? "Creating…" : "Create Organization"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
