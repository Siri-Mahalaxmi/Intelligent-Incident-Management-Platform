"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import SeverityBadge from "@/components/SeverityBadge";
import StatusBadge from "@/components/StatusBadge";
import {
  getOrganization, getOrgUsers, getOrgIncidents,
  updateOrganization, updateUserProfile,
  type OrgDetail, type OrgUser,
} from "@/services/adminService";
import type { Incident } from "@/types/incident";

type Tab = "overview" | "users" | "incidents" | "settings";

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-indigo-600 text-indigo-600"
          : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      {label}
    </button>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function OrgDetailPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [tab, setTab]       = useState<Tab>("overview");
  const [org, setOrg]       = useState<OrgDetail | null>(null);
  const [users, setUsers]   = useState<OrgUser[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading]     = useState(true);

  // Edit org state
  const [editName, setEditName]     = useState("");
  const [editDomain, setEditDomain] = useState("");
  const [saving, setSaving]         = useState(false);
  const [saveMsg, setSaveMsg]       = useState("");

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    Promise.all([getOrganization(orgId), getOrgUsers(orgId), getOrgIncidents(orgId)])
      .then(([o, u, i]) => {
        setOrg(o); setUsers(u); setIncidents(i);
        setEditName(o.name); setEditDomain(o.domain ?? "");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [orgId]);

  async function handleSaveOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || saving) return;
    setSaving(true); setSaveMsg("");
    try {
      const updated = await updateOrganization(orgId, { name: editName, domain: editDomain || undefined });
      setOrg((prev) => prev ? { ...prev, ...updated } : prev);
      setSaveMsg("Saved successfully.");
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "Save failed.");
    } finally { setSaving(false); }
  }

  async function handleToggleUserStatus(user: OrgUser) {
    const newStatus = user.status === "active" ? "inactive" : "active";
    try {
      await updateUserProfile(user.id, { status: newStatus });
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, status: newStatus } : u));
    } catch (err) { console.error(err); }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <TopBar />
        <div className="flex items-center justify-center h-96">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-slate-50">
        <TopBar />
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <p className="text-slate-500">Organization not found.</p>
          <Link href="/admin" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">Back to Organizations</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar />
      <main className="px-6 py-6 space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/admin" className="hover:text-indigo-600 transition-colors">Organizations</Link>
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-slate-700">{org.name}</span>
        </div>

        {/* Org header */}
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xl uppercase">
                {org.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">{org.name}</h1>
                <p className="text-sm text-slate-500 mt-0.5">{org.domain ?? "No domain"}</p>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
              org.status === "active" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-500 ring-slate-200"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${org.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`} />
              {org.status === "active" ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Users</p>
              <p className="text-2xl font-bold text-slate-800">{org.user_count}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Incidents</p>
              <p className="text-2xl font-bold text-slate-800">{org.incident_count}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Created</p>
              <p className="text-slate-700">{formatDate(org.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4">
          {(["overview", "users", "incidents", "settings"] as Tab[]).map((t) => (
            <TabButton key={t} label={t.charAt(0).toUpperCase() + t.slice(1)} active={tab === t} onClick={() => setTab(t)} />
          ))}
        </div>

        {/* Overview tab */}
        {tab === "overview" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Total Users",     value: org.user_count },
              { label: "Total Incidents", value: org.incident_count },
              { label: "Active Incidents", value: incidents.filter((i) => i.status !== "RESOLVED").length },
              { label: "Resolved Incidents", value: incidents.filter((i) => i.status === "RESOLVED").length },
              { label: "Critical Incidents", value: incidents.filter((i) => i.severity === "CRITICAL").length },
              { label: "Reports Generated", value: incidents.filter((i) => i.report_result).length },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-white border border-slate-200 shadow-sm p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
                <p className="text-2xl font-bold text-slate-800">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Users tab */}
        {tab === "users" && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700">Organization Users ({users.length})</h2>
            </div>
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr className="bg-slate-50/80">
                  {["Name", "Email", "Role", "Status", "Last Active", "Actions"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold uppercase flex-shrink-0">
                          {(user.full_name ?? user.email ?? "?").charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-slate-800">{user.full_name ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500">{user.email ?? "—"}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                        user.role === "organization_admin"
                          ? "bg-indigo-50 text-indigo-700 ring-indigo-200"
                          : "bg-slate-100 text-slate-600 ring-slate-200"
                      }`}>
                        {user.role === "organization_admin" ? "Admin" : "Member"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                        user.status === "active"
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-red-50 text-red-600 ring-red-200"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${user.status === "active" ? "bg-emerald-500" : "bg-red-500"}`} />
                        {user.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-400">
                      {user.last_active_at ? formatDate(user.last_active_at) : "Never"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <button
                        onClick={() => handleToggleUserStatus(user)}
                        className={`text-xs font-medium hover:underline ${
                          user.status === "active" ? "text-red-500 hover:text-red-700" : "text-emerald-600 hover:text-emerald-800"
                        }`}
                      >
                        {user.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-sm text-slate-400">No users in this organization yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Incidents tab */}
        {tab === "incidents" && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700">Incidents ({incidents.length})</h2>
            </div>
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr className="bg-slate-50/80">
                  {["ID", "Title", "Service", "Severity", "Status", "Created"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="whitespace-nowrap px-5 py-4">
                      <Link href={`/incidents/${inc.incident_id ?? inc.id}`}
                        className="font-mono text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                        {inc.incident_id ?? inc.id}
                      </Link>
                    </td>
                    <td className="px-5 py-4 max-w-[180px]">
                      <p className="text-sm font-medium text-slate-800 truncate">{inc.title}</p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">{inc.service}</td>
                    <td className="whitespace-nowrap px-5 py-4"><SeverityBadge severity={inc.severity} /></td>
                    <td className="whitespace-nowrap px-5 py-4"><StatusBadge status={inc.status} /></td>
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-400">{formatDate(inc.created_at)}</td>
                  </tr>
                ))}
                {incidents.length === 0 && (
                  <tr><td colSpan={6} className="py-16 text-center text-sm text-slate-400">No incidents.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Settings tab */}
        {tab === "settings" && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 max-w-md">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-5">Edit Organization</h2>
            <form onSubmit={handleSaveOrg} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} required
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Domain</label>
                <input value={editDomain} onChange={(e) => setEditDomain(e.target.value)} placeholder="e.g. acmecorp.com"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              {saveMsg && <p className={`text-sm ${saveMsg.includes("success") ? "text-emerald-600" : "text-red-600"}`}>{saveMsg}</p>}
              <button type="submit" disabled={saving}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-70">
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
