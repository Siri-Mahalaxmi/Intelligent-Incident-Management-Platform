"""
Report routes — protected by JWT authentication.

POST /incidents/{incident_id}/report
"""

from fastapi import APIRouter, Depends

from app.auth import get_current_user
from app.models.incident import ReportResult
from app.services.report_service import run_report
from app.services.profile_service import UserProfile

router = APIRouter(prefix="/incidents", tags=["Report"])


@router.post("/{incident_id}/report", response_model=ReportResult)
def generate_incident_report(
    incident_id: str,
    user: UserProfile = Depends(get_current_user),
):
    """
    Generate a structured post-mortem report.
    Requires /analyze and /rca to have been run first.
    Org users can only generate reports for their organization's incidents.
    """
    org_id = None if user.is_central_admin else user.organization_id
    return run_report(incident_id, organization_id=org_id)
