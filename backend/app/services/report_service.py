"""
Report Service — orchestrates the Report Agent call and persists the result.
Now accepts organization_id to enforce org-scoped access.
"""

from typing import Optional
from fastapi import HTTPException

from app.database import supabase_client
from app.models.incident import ReportResult
from app.services.incident_service import get_incident_by_id, update_report_result


def _coerce_logs(logs) -> str:
    if isinstance(logs, list):
        return "\n".join(str(line) for line in logs)
    return str(logs) if logs is not None else ""


def run_report(
    incident_id: str,
    organization_id: Optional[str] = None,
) -> ReportResult:
    """
    Generate a structured post-mortem report for the given incident.
    Scopes incident access and similarity search to the same org.
    """
    from ai.report_agent import generate_report

    incident = get_incident_by_id(incident_id, organization_id=organization_id)

    if not incident.ai_summary:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Incident '{incident_id}' has no AI analysis yet. "
                "Run POST /incidents/{incident_id}/analyze first."
            ),
        )

    if not incident.rca_result:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Incident '{incident_id}' has no RCA result yet. "
                "Run POST /incidents/{incident_id}/rca first."
            ),
        )

    similar_incidents = []
    try:
        from app.services.embedding_service import find_similar_incidents
        similar = find_similar_incidents(
            incident_id=incident_id,
            match_threshold=0.0,
            match_count=3,
            organization_id=organization_id,
        )
        similar_incidents = [
            {
                "incident_id": s.incident_id,
                "title": s.title,
                "service": s.service,
                "similarity": s.similarity,
            }
            for s in similar
        ]
    except Exception:
        similar_incidents = []

    incident_dict = {
        "title": incident.title,
        "service": incident.service,
        "severity": incident.severity,
        "status": incident.status,
        "description": incident.description or "",
        "logs": _coerce_logs(incident.logs),
    }

    ai_summary = incident.ai_summary or {}
    rca_result = incident.rca_result or {}

    log_analysis = ai_summary if isinstance(ai_summary, dict) else {}
    rca_data = rca_result.get("rca", {}) if isinstance(rca_result, dict) else {}
    resolution_data = rca_result.get("resolution", {}) if isinstance(rca_result, dict) else {}

    try:
        report = generate_report(
            incident=incident_dict,
            log_analysis=log_analysis,
            rca=rca_data,
            resolution=resolution_data,
            similar_incidents=similar_incidents,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Report Agent failed: {exc}",
        ) from exc

    update_report_result(incident_id, report)

    return ReportResult(
        incident_id=incident_id,
        executive_summary=report.get("executive_summary", ""),
        what_happened=report.get("what_happened", ""),
        root_cause=report.get("root_cause", ""),
        evidence=report.get("evidence", []),
        resolution_steps_taken=report.get("resolution_steps_taken", []),
        similar_incidents_referenced=report.get("similar_incidents_referenced", []),
        prevention_recommendations=report.get("prevention_recommendations", []),
        severity_assessment=report.get("severity_assessment", ""),
        estimated_impact=report.get("estimated_impact", ""),
    )
