"""
RCA Service — orchestrates the multi-agent pipeline for root cause analysis.

Flow:
  1. Fetch the incident from Supabase
  2. Run similarity search to get top-3 similar past incidents
  3. Pass logs + similar incidents into the multi-agent pipeline
  4. Persist the result to the rca_result column
  5. Return a typed RCAResult
"""

from fastapi import HTTPException

from app.database import supabase_client
from app.models.incident import (
    LogAnalysisSummary,
    RCASummary,
    RCAResult,
    ResolutionSummary,
)
from app.services.incident_service import get_incident_by_id


def _coerce_logs(logs) -> str:
    if isinstance(logs, list):
        return "\n".join(str(line) for line in logs)
    return str(logs) if logs is not None else ""


def run_rca(incident_id: str) -> RCAResult:
    """
    Run the full 3-agent RCA pipeline for the given incident.

    Raises:
        404 — incident not found
        422 — incident has no logs
        500 — pipeline failure
    """
    # Step 1: Fetch incident
    incident = get_incident_by_id(incident_id)

    logs_str = _coerce_logs(incident.logs)
    if not logs_str.strip():
        raise HTTPException(
            status_code=422,
            detail=f"Incident '{incident_id}' has no logs to analyse.",
        )

    # Step 2: Retrieve similar past incidents via pgvector
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
        # Non-fatal — pipeline still runs without similar incidents
        similar_incidents = []

    # Step 3: Run the multi-agent pipeline
    try:
        from ai.multi_agent_pipeline import run_rca_pipeline
        result = run_rca_pipeline(
            logs=logs_str,
            service=incident.service,
            severity=incident.severity,
            similar_incidents=similar_incidents,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"RCA pipeline failed: {exc}",
        ) from exc

    # Step 4: Persist to Supabase
    supabase_client.table("incidents").update(
        {"rca_result": result}
    ).eq("incident_id", incident_id).execute()

    # Step 5: Return typed response
    log_data = result.get("log_analysis", {})
    rca_data = result.get("rca", {})
    res_data = result.get("resolution", {})

    return RCAResult(
        incident_id=incident_id,
        log_analysis=LogAnalysisSummary(
            summary=log_data.get("summary", ""),
            probable_severity=log_data.get("probable_severity", "MEDIUM"),
            key_error_patterns=log_data.get("key_error_patterns", []),
            confidence=float(log_data.get("confidence", 0.0)),
        ),
        rca=RCASummary(
            root_cause=rca_data.get("root_cause", ""),
            contributing_factors=rca_data.get("contributing_factors", []),
            confidence=float(rca_data.get("confidence", 0.0)),
        ),
        resolution=ResolutionSummary(
            immediate_actions=res_data.get("immediate_actions", []),
            long_term_actions=res_data.get("long_term_actions", []),
            estimated_resolution_time=res_data.get(
                "estimated_resolution_time", "Unknown"
            ),
        ),
        pipeline_version=result.get("pipeline_version", "v1"),
    )
