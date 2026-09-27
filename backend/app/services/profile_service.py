"""
Profile service — looks up application user profiles from the profiles table.

All queries use the service-role client (bypasses RLS) since this runs
server-side only. The profile data is used to enforce authorization in
route handlers — it is never sent raw to the client.
"""

from __future__ import annotations

from typing import Optional
from dataclasses import dataclass

from fastapi import HTTPException
from app.database import supabase_client


@dataclass
class UserProfile:
    """Lightweight representation of a profiles row."""
    id: str
    auth_user_id: str
    organization_id: Optional[str]
    role: str          # 'central_admin' | 'organization_admin' | 'organization_member'
    full_name: Optional[str]
    email: Optional[str]
    status: str

    @property
    def is_central_admin(self) -> bool:
        return self.role == "central_admin"

    @property
    def is_org_admin(self) -> bool:
        return self.role == "organization_admin"

    @property
    def is_org_user(self) -> bool:
        return self.role in ("organization_admin", "organization_member")


def get_profile_by_auth_id(auth_user_id: str) -> UserProfile:
    """
    Fetch the application profile for a given Supabase auth user UUID.
    Raises 401 if no profile is found (user exists in auth but not yet onboarded).
    Raises 403 if the profile is inactive.
    """
    response = (
        supabase_client.table("profiles")
        .select("id, auth_user_id, organization_id, role, full_name, email, status")
        .eq("auth_user_id", auth_user_id)
        .single()
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=401,
            detail="No application profile found for this user. Contact your administrator.",
        )

    row = response.data

    if row.get("status") == "inactive":
        raise HTTPException(
            status_code=403,
            detail="Your account has been deactivated. Contact your administrator.",
        )

    return UserProfile(
        id=row["id"],
        auth_user_id=row["auth_user_id"],
        organization_id=row.get("organization_id"),
        role=row["role"],
        full_name=row.get("full_name"),
        email=row.get("email"),
        status=row["status"],
    )


def get_organization_by_id(org_id: str) -> dict:
    """Fetch a single organization row. Raises 404 if not found."""
    response = (
        supabase_client.table("organizations")
        .select("id, name, domain, status, created_at")
        .eq("id", org_id)
        .single()
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail=f"Organization '{org_id}' not found.")
    return response.data


def get_all_organizations() -> list[dict]:
    """Return all organizations ordered by name."""
    response = (
        supabase_client.table("organizations")
        .select("id, name, domain, status, created_at")
        .order("name")
        .execute()
    )
    return response.data or []


def get_profiles_by_org(org_id: str) -> list[dict]:
    """Return all profiles belonging to a given organization."""
    response = (
        supabase_client.table("profiles")
        .select("id, auth_user_id, full_name, email, role, status, last_active_at, created_at")
        .eq("organization_id", org_id)
        .order("full_name")
        .execute()
    )
    return response.data or []


def update_profile_last_active(auth_user_id: str) -> None:
    """Bump last_active_at — called on every authenticated request (best-effort)."""
    try:
        supabase_client.table("profiles").update(
            {"last_active_at": "now()"}
        ).eq("auth_user_id", auth_user_id).execute()
    except Exception:
        pass  # non-fatal


def create_organization(name: str, domain: Optional[str] = None) -> dict:
    """Create a new organization. Returns the created row."""
    response = (
        supabase_client.table("organizations")
        .insert({"name": name, "domain": domain, "status": "active"})
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create organization.")
    return response.data[0]


def update_organization(org_id: str, updates: dict) -> dict:
    """Update organization fields. Returns the updated row."""
    allowed = {"name", "domain", "status"}
    filtered = {k: v for k, v in updates.items() if k in allowed}
    if not filtered:
        raise HTTPException(status_code=422, detail="No valid fields to update.")

    response = (
        supabase_client.table("organizations")
        .update(filtered)
        .eq("id", org_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail=f"Organization '{org_id}' not found.")
    return response.data[0]


def update_profile(profile_id: str, updates: dict) -> dict:
    """
    Update a profile record. Only allows safe fields.
    Role and organization_id changes are allowed here (called server-side only).
    """
    allowed = {"full_name", "email", "role", "status", "organization_id"}
    filtered = {k: v for k, v in updates.items() if k in allowed}
    if not filtered:
        raise HTTPException(status_code=422, detail="No valid fields to update.")

    response = (
        supabase_client.table("profiles")
        .update(filtered)
        .eq("id", profile_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail=f"Profile '{profile_id}' not found.")
    return response.data[0]


def get_org_incident_counts() -> dict[str, int]:
    """Return a mapping of organization_id → incident count."""
    response = (
        supabase_client.table("incidents")
        .select("organization_id")
        .execute()
    )
    counts: dict[str, int] = {}
    for row in (response.data or []):
        oid = row.get("organization_id")
        if oid:
            counts[oid] = counts.get(oid, 0) + 1
    return counts


def get_org_user_counts() -> dict[str, int]:
    """Return a mapping of organization_id → user count."""
    response = (
        supabase_client.table("profiles")
        .select("organization_id")
        .not_.is_("organization_id", "null")
        .execute()
    )
    counts: dict[str, int] = {}
    for row in (response.data or []):
        oid = row.get("organization_id")
        if oid:
            counts[oid] = counts.get(oid, 0) + 1
    return counts
