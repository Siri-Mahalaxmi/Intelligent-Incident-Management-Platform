"use client";

import { useAuth } from "@/context/AuthContext";
import TopBar from "@/components/TopBar";

export default function SettingsPage() {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar />
      <main className="px-6 py-6 max-w-2xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Your account and workspace settings.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Account</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              ["Name",         profile?.full_name ?? "—"],
              ["Email",        profile?.email ?? "—"],
              ["Role",         profile?.role?.replace(/_/g, " ") ?? "—"],
              ["Organization", profile?.organization?.name ?? "—"],
              ["Status",       profile?.status ?? "—"],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-slate-700 capitalize">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {profile?.organization && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Organization</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ["Name",   profile.organization.name],
                ["Domain", profile.organization.domain ?? "—"],
                ["Status", profile.organization.status],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
                  <p className="text-slate-700 capitalize">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-slate-400">
          To change your role or organization, contact your Central Administrator.
        </p>
      </main>
    </div>
  );
}
