"""
Report Service — orchestrates the Report Agent call and persists the result.

Flow:
  1. Fetch the incident (with all JSONB columns) from Supabase
  2. Validate that ai_summary and rca_result exist (run /analyze and /rca first)
  3. Pull similar incidents from pgvector for report context
  4. Call the Report Agent
  5. Persist report_result to Supabase
  6. Return a typed ReportResult
"""

from fastapi import HTTPException

from app.database import supabase_client
from app.models.incident import ReportResult
from app.services.incident_service import get_incident_by_id, update_report_result


def _coerce_logs(logs) -> str:
    if isinstance(logs, list):
        return "\n".join(str(line) for line in logs)
    return str(logs) if logs is not None else ""


def run_report(incident_id: str) -> ReportResult:
    """
    Generate a structured post-mortem report for the given incident.

    Requires that /analyze and /rca have already been run (ai_summary and
    rca_result must be populated). If they are missing, returns a 422 error
    with a clear message so the caller knows what to run first.

    Raises:
        404 — incident not found
        422 — ai_summary or rca_result not yet populated
        500 — Report Agent failure
    """
    from ai.report_agent import generate_report

    # Step 1: Fetch the full incident row
    incident = get_incident_by_id(incident_id)

    # Step 2: Validate prerequisites
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

    # Step 3: Get similar incidents for report context (non-fatal if it fails)
    similar_incidents = []
    try:
        from app.services.embedding_service import find_similar_incidents
        similar = find_similar_incidents(
            incident_id=incident_id,
            match_threshold=0.0,
            match_count=3,
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

    # Step 4: Build structured input dicts for the Report Agent
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

    # Step 5: Run the Report Agent
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

    # Step 6: Persist to Supabase
    update_report_result(incident_id, report)

    # Step 7: Return typed response
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
