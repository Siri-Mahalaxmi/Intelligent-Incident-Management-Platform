"""
Admin routes — central_admin only.

GET  /admin/organizations                — list all organizations with user/incident counts
POST /admin/organizations                — create a new organization
GET  /admin/organizations/{org_id}       — single organization detail
PUT  /admin/organizations/{org_id}       — update organization
GET  /admin/organizations/{org_id}/users — users in an organization
PUT  /admin/profiles/{profile_id}        — update a user profile (role, status, etc.)
GET  /admin/stats                        — platform-wide stats
GET  /admin/incidents                    — all incidents across all orgs (with optional org filter)
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query

from app.auth import require_central_admin
from app.services.profile_service import (
    UserProfile,
    create_organization,
    get_all_organizations,
    get_organization_by_id,
    get_org_incident_counts,
    get_org_user_counts,
    get_profiles_by_org,
    update_organization,
    update_profile,
)
from app.services.incident_service import get_all_incidents
from app.database import supabase_client

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats")
def platform_stats(admin: UserProfile = Depends(require_central_admin)):
    """Platform-wide aggregate statistics."""
    orgs = get_all_organizations()
    incident_counts = get_org_incident_counts()
    user_counts = get_org_user_counts()

    total_incidents = sum(incident_counts.values())
    total_users = sum(user_counts.values())
    active_orgs = sum(1 for o in orgs if o.get("status") == "active")

    return {
        "total_organizations": len(orgs),
        "active_organizations": active_orgs,
        "total_users": total_users,
        "total_incidents": total_incidents,
    }


@router.get("/organizations")
def list_organizations(admin: UserProfile = Depends(require_central_admin)):
    """Return all organizations with user and incident counts."""
    orgs = get_all_organizations()
    incident_counts = get_org_incident_counts()
    user_counts = get_org_user_counts()

    return [
        {
            **org,
            "user_count": user_counts.get(org["id"], 0),
            "incident_count": incident_counts.get(org["id"], 0),
        }
        for org in orgs
    ]


@router.post("/organizations", status_code=201)
def create_org(
    payload: dict,
    admin: UserProfile = Depends(require_central_admin),
):
    """Create a new organization."""
    name = payload.get("name", "").strip()
    if not name:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="Organization name is required.")
    return create_organization(name=name, domain=payload.get("domain"))


@router.get("/organizations/{org_id}")
def get_organization(
    org_id: str,
    admin: UserProfile = Depends(require_central_admin),
):
    """Return a single organization with user and incident counts."""
    org = get_organization_by_id(org_id)
    incident_counts = get_org_incident_counts()
    user_counts = get_org_user_counts()
    return {
        **org,
        "user_count": user_counts.get(org_id, 0),
        "incident_count": incident_counts.get(org_id, 0),
    }


@router.put("/organizations/{org_id}")
def update_org(
    org_id: str,
    payload: dict,
    admin: UserProfile = Depends(require_central_admin),
):
    """Update organization fields (name, domain, status)."""
    return update_organization(org_id, payload)


@router.get("/organizations/{org_id}/users")
def get_org_users(
    org_id: str,
    admin: UserProfile = Depends(require_central_admin),
):
    """Return all user profiles belonging to the given organization."""
    return get_profiles_by_org(org_id)


@router.get("/organizations/{org_id}/incidents")
def get_org_incidents(
    org_id: str,
    admin: UserProfile = Depends(require_central_admin),
):
    """Return all incidents belonging to the given organization."""
    return get_all_incidents(organization_id=org_id)


@router.put("/profiles/{profile_id}")
def update_user_profile(
    profile_id: str,
    payload: dict,
    admin: UserProfile = Depends(require_central_admin),
):
    """
    Update a user profile — role, status, organization_id, full_name, email.
    central_admin only. Changes are applied server-side; users cannot call this.
    """
    return update_profile(profile_id, payload)


@router.get("/incidents")
def list_all_incidents(
    org_id: Optional[str] = Query(default=None, description="Filter by organization ID"),
    admin: UserProfile = Depends(require_central_admin),
):
    """List all incidents. Optionally filter by organization."""
    return get_all_incidents(organization_id=org_id)
