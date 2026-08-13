"""
Analysis routes.

POST /incidents/{incident_id}/analyze — run the Log Analysis Agent on an incident
"""

from fastapi import APIRouter

from app.models.incident import AnalysisResult
from app.services.analysis_service import run_analysis

router = APIRouter(prefix="/incidents", tags=["Analysis"])


@router.post("/{incident_id}/analyze", response_model=AnalysisResult)
def analyze_incident(incident_id: str):
    """
    Trigger AI log analysis for the given incident.

    - Fetches the incident's raw logs from Supabase.
    - Runs the Log Analysis Agent (Gemini-backed).
    - Persists the result to the `ai_summary` column.
    - Returns the structured analysis.

    **incident_id**: human-readable ID, e.g. `INC-1001`
    """
    return run_analysis(incident_id)
