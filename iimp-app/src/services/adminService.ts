/**
 * adminService.ts — Central Admin API calls.
 * All calls require a central_admin JWT — enforced server-side.
 */

import { apiRequest } from "@/services/apiClient";
import type { Incident } from "@/types/incident";

export interface OrgSummary {
  id: string;
  name: string;
  domain: string | null;
  status: "active" | "inactive";
  created_at: string;
  user_count: number;
  incident_count: number;
}

export interface OrgDetail extends OrgSummary {
  user_count: number;
  incident_count: number;
}

export interface OrgUser {
  id: string;
  auth_user_id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  status: string;
  last_active_at: string | null;
  created_at: string;
}

export interface PlatformStats {
  total_organizations: number;
  active_organizations: number;
  total_users: number;
  total_incidents: number;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  return apiRequest<PlatformStats>("/admin/stats");
}

export async function getOrganizations(): Promise<OrgSummary[]> {
  return apiRequest<OrgSummary[]>("/admin/organizations");
}

export async function getOrganization(orgId: string): Promise<OrgDetail> {
  return apiRequest<OrgDetail>(`/admin/organizations/${orgId}`);
}

export async function createOrganization(name: string, domain?: string): Promise<OrgDetail> {
  return apiRequest<OrgDetail>("/admin/organizations", {
    method: "POST",
    body: JSON.stringify({ name, domain }),
  });
}

export async function updateOrganization(
  orgId: string,
  updates: Partial<{ name: string; domain: string; status: string }>
): Promise<OrgDetail> {
  return apiRequest<OrgDetail>(`/admin/organizations/${orgId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function getOrgUsers(orgId: string): Promise<OrgUser[]> {
  return apiRequest<OrgUser[]>(`/admin/organizations/${orgId}/users`);
}

export async function getOrgIncidents(orgId: string): Promise<Incident[]> {
  return apiRequest<Incident[]>(`/admin/organizations/${orgId}/incidents`);
}

export async function updateUserProfile(
  profileId: string,
  updates: Partial<{ full_name: string; email: string; role: string; status: string }>
): Promise<OrgUser> {
  return apiRequest<OrgUser>(`/admin/profiles/${profileId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function getAllIncidents(orgId?: string): Promise<Incident[]> {
  const qs = orgId ? `?org_id=${orgId}` : "";
  return apiRequest<Incident[]>(`/admin/incidents${qs}`);
}
