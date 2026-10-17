/**
 * Auth and profile types shared across the application.
 */

export type UserRole =
  | "central_admin"
  | "organization_admin"
  | "organization_member";

export interface Organization {
  id: string;
  name: string;
  domain: string | null;
  status: "active" | "inactive";
  created_at: string;
}

export interface UserProfile {
  id: string;
  auth_user_id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  status: "active" | "inactive";
  organization_id: string | null;
  organization: Organization | null;
}
