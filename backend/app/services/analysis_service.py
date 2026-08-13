"""
Analysis service — orchestrates the Log Analysis Agent call and persists the result.

The ai/ package is owned by another team member and must not be modified.
We import it exactly as agreed: from ai.log_analysis_agent import analyze_incident_logs
"""

from fastapi import HTTPException

from ai.log_analysis_agent import analyze_incident_logs
from app.models.incident import AnalysisResult
from app.services.incident_service import get_incident_by_id, update_ai_summary


def run_analysis(incident_id: str) -> AnalysisResult:
    """
    1. Fetch the incident and its raw logs from Supabase.
    2. Pass the logs to the Log Analysis Agent.
    3. Persist the result back to ai_summary.
    4. Return a structured AnalysisResult.

    Raises:
        404  — if the incident does not exist.
        422  — if the incident has no logs to analyse.
        500  — if the agent returns an unexpected shape.
    """
    # Step 1: Fetch incident (raises 404 if not found)
    incident = get_incident_by_id(incident_id)

    if not incident.logs or not incident.logs.strip():
        raise HTTPException(
            status_code=422,
            detail=f"Incident '{incident_id}' has no logs to analyse.",
        )

    # Step 2: Run the Log Analysis Agent
    try:
        result: dict = analyze_incident_logs(incident.logs)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Log Analysis Agent failed: {exc}",
        ) from exc

    # Step 3: Validate the expected shape
    required_keys = {"summary", "probable_severity", "key_error_patterns", "confidence"}
    missing = required_keys - result.keys()
    if missing:
        raise HTTPException(
            status_code=500,
            detail=f"Log Analysis Agent returned incomplete result. Missing keys: {missing}",
        )

    # Step 4: Persist to Supabase
    update_ai_summary(incident_id, result)

    # Step 5: Return typed response
    return AnalysisResult(
        incident_id=incident_id,
        summary=result["summary"],
        probable_severity=result["probable_severity"],
        key_error_patterns=result["key_error_patterns"],
        confidence=float(result["confidence"]),
    )
