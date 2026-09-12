"""
Multi-Agent Pipeline — Orchestrator

Runs three specialized agents in sequence, passing each agent's output
as context to the next agent.

Pipeline:
  Agent 1: Log Analysis Agent  — extracts error patterns from raw logs
      ↓ (logs, error_patterns)
  Agent 2: RCA Agent           — identifies root cause using logs + patterns + similar incidents
      ↓ (root_cause, contributing_factors)
  Agent 3: Resolution Agent    — recommends immediate and long-term actions

Final output is a single combined dict stored as rca_result in Supabase.
"""

from ai.log_analysis_agent import analyze_incident_logs
from ai.rca_agent import analyze_root_cause
from ai.resolution_agent import recommend_resolution


def run_rca_pipeline(
    logs: str,
    service: str,
    severity: str,
    similar_incidents: list | None = None,
) -> dict:
    """
    Run the full 3-agent RCA pipeline.

    Args:
        logs:              raw log text from the incident
        service:           affected service name (e.g. "Payment API")
        severity:          incident severity (e.g. "CRITICAL")
        similar_incidents: list of similar past incidents from pgvector search
                           Each item: { incident_id, title, service, similarity }

    Returns:
        Combined dict with all agent outputs:
        {
            "log_analysis":  { summary, probable_severity, key_error_patterns, confidence },
            "rca":           { root_cause, contributing_factors, confidence },
            "resolution":    { immediate_actions, long_term_actions, estimated_resolution_time },
            "pipeline_version": "v1"
        }
    """
    if similar_incidents is None:
        similar_incidents = []

    # ------------------------------------------------------------------
    # Agent 1: Log Analysis Agent
    # Extracts structured error patterns from raw logs.
    # ------------------------------------------------------------------
    log_analysis = analyze_incident_logs(logs)

    error_patterns = log_analysis.get("key_error_patterns", [])

    # ------------------------------------------------------------------
    # Agent 2: RCA Agent
    # Takes logs + error patterns + similar incidents → root cause.
    # ------------------------------------------------------------------
    rca = analyze_root_cause(
        logs=logs,
        error_patterns=error_patterns,
        similar_incidents=similar_incidents,
    )

    # ------------------------------------------------------------------
    # Agent 3: Resolution Agent
    # Takes root cause → recommended actions.
    # ------------------------------------------------------------------
    resolution = recommend_resolution(
        root_cause=rca["root_cause"],
        contributing_factors=rca["contributing_factors"],
        service=service,
        severity=severity,
    )

    return {
        "log_analysis": log_analysis,
        "rca": rca,
        "resolution": resolution,
        "pipeline_version": "v1",
    }
