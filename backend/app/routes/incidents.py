"""
Incident routes — all protected by JWT authentication.

GET   /incidents               — list incidents (org-scoped for org users)
GET   /incidents/{incident_id} — full incident detail (org-scoped)
POST  /incidents               — create incident (assigned to caller's org)
PATCH /incidents/{incident_id}/status — update status (org-scoped)
"""

from typing import List

from fastapi import APIRouter, Depends

from app.auth import get_current_user, require_org_access
from app.models.incident import IncidentDetailFull, IncidentSummary
from app.services.incident_service import (
    create_incident,
    get_all_incidents,
    get_incident_by_id,
    update_status,
)
from app.services.profile_service import UserProfile

router = APIRouter(prefix="/incidents", tags=["Incidents"])


@router.get("", response_model=List[IncidentSummary])
def list_incidents(user: UserProfile = Depends(get_current_user)):
    """
    Return incidents ordered newest first.
    - central_admin → all incidents across all orgs
    - org user → only incidents belonging to their organization
    """
    org_id = None if user.is_central_admin else user.organization_id
    return get_all_incidents(organization_id=org_id)


@router.post("", response_model=IncidentDetailFull)
def create_incident_route(
    payload: dict,
    user: UserProfile = Depends(get_current_user),
):
    """
    Create a new incident.
    - org user → automatically assigned to their organization
    - central_admin → must supply organization_id in payload, or it is left null
    """
    org_id = (
        payload.get("organization_id")
        if user.is_central_admin
        else user.organization_id
    )
    return create_incident(
        payload,
        organization_id=org_id,
        created_by=user.auth_user_id,
    )


@router.get("/{incident_id}", response_model=IncidentDetailFull)
def get_incident(
    incident_id: str,
    user: UserProfile = Depends(get_current_user),
):
    """
    Return full detail for a single incident.
    Org users can only access incidents belonging to their organization.
    """
    org_id = None if user.is_central_admin else user.organization_id
    return get_incident_by_id(incident_id, organization_id=org_id)


@router.patch("/{incident_id}/status", response_model=IncidentSummary)
def update_incident_status(
    incident_id: str,
    payload: dict,
    user: UserProfile = Depends(get_current_user),
):
    """
    Update the status of an incident.
    Payload: `{ "status": "OPEN" | "IN_PROGRESS" | "RESOLVED" }`
    """
    org_id = None if user.is_central_admin else user.organization_id
    return update_status(incident_id, payload.get("status", ""), organization_id=org_id)
