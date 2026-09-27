"""
Analysis routes — protected by JWT authentication.

POST /incidents/{incident_id}/analyze
"""

from fastapi import APIRouter, Depends

from app.auth import get_current_user
from app.models.incident import AnalysisResult
from app.services.analysis_service import run_analysis
from app.services.profile_service import UserProfile

router = APIRouter(prefix="/incidents", tags=["Analysis"])


@router.post("/{incident_id}/analyze", response_model=AnalysisResult)
def analyze_incident(
    incident_id: str,
    user: UserProfile = Depends(get_current_user),
):
    """
    Trigger AI log analysis for the given incident.
    Org users can only analyze incidents belonging to their organization.
    """
    org_id = None if user.is_central_admin else user.organization_id
    return run_analysis(incident_id, organization_id=org_id)
