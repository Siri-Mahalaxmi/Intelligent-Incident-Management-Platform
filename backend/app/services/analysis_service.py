"""
Analysis service — orchestrates the Log Analysis Agent call and persists the result.
Now accepts organization_id to enforce org-scoped access when fetching the incident.
"""

from typing import Optional
from fastapi import HTTPException

from ai.log_analysis_agent import normalize_analysis_result
from app.models.incident import AnalysisResult
from app.services.incident_service import get_incident_by_id, update_ai_summary


def _coerce_logs(logs) -> str:
    if isinstance(logs, list):
        return "\n".join(str(line) for line in logs)
    return str(logs) if logs is not None else ""


def run_analysis(
    incident_id: str,
    organization_id: Optional[str] = None,
) -> AnalysisResult:
    """
    1. Fetch the incident (org-scoped if organization_id provided).
    2. Coerce logs to a plain string.
    3. Pass the logs to the Log Analysis Agent.
    4. Persist the result back to ai_summary.
    5. Generate and store an embedding (non-fatal).
    6. Return a structured AnalysisResult.
    """
    from ai.log_analysis_agent import analyze_incident_logs

    incident = get_incident_by_id(incident_id, organization_id=organization_id)

    logs_str = _coerce_logs(incident.logs)
    if not logs_str.strip():
        raise HTTPException(
            status_code=422,
            detail=f"Incident '{incident_id}' has no logs to analyse.",
        )

    try:
        result: dict = analyze_incident_logs(logs_str)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Log Analysis Agent failed: {exc}",
        ) from exc

    result = normalize_analysis_result(result)

    required_keys = {"summary", "probable_severity", "key_error_patterns", "confidence"}
    missing = required_keys - result.keys()
    if missing:
        raise HTTPException(
            status_code=500,
            detail=f"Log Analysis Agent returned incomplete result. Missing keys: {missing}",
        )

    update_ai_summary(incident_id, result)

    try:
        from app.services.embedding_service import generate_and_store_embedding
        generate_and_store_embedding(incident_id)
    except Exception:
        pass

    return AnalysisResult(
        incident_id=incident_id,
        summary=result["summary"],
        probable_severity=result["probable_severity"],
        key_error_patterns=result["key_error_patterns"],
        confidence=float(result["confidence"]),
    )
