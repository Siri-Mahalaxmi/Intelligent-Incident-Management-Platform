"""
Report routes.

POST /incidents/{incident_id}/report — generate a structured post-mortem report
"""

from fastapi import APIRouter

from app.models.incident import ReportResult
from app.services.report_service import run_report

router = APIRouter(prefix="/incidents", tags=["Report"])


@router.post("/{incident_id}/report", response_model=ReportResult)
def generate_incident_report(incident_id: str):
    """
    Generate a structured post-mortem incident report.

    This endpoint requires that both AI analysis (`/analyze`) and RCA (`/rca`)
    have been run first. If either is missing, returns a 422 error.

    The report synthesizes:
    - Executive summary (non-technical)
    - Detailed timeline
    - Root cause with evidence
    - Resolution steps
    - Similar past incidents
    - Prevention recommendations

    Results are persisted to the `report_result` column in Supabase.

    - **incident_id**: human-readable ID, e.g. `INC-1001`
    """
    return run_report(incident_id)
