"""
RCA routes — protected by JWT authentication.

POST /incidents/{incident_id}/rca
"""

from fastapi import APIRouter, Depends

from app.auth import get_current_user
from app.models.incident import RCAResult
from app.services.rca_service import run_rca
from app.services.profile_service import UserProfile

router = APIRouter(prefix="/incidents", tags=["RCA"])


@router.post("/{incident_id}/rca", response_model=RCAResult)
def rca_incident(
    incident_id: str,
    user: UserProfile = Depends(get_current_user),
):
    """
    Run the multi-agent Root Cause Analysis pipeline on an incident.
    Org users can only run RCA for incidents belonging to their organization.
    """
    org_id = None if user.is_central_admin else user.organization_id
    return run_rca(incident_id, organization_id=org_id)
