"""
Analysis service — orchestrates the Log Analysis Agent call and persists the result.

The ai/ package is owned by another team member and must not be modified.
We import analyze_incident_logs inside run_analysis() rather than at module
level so the import only happens at call time, after main.py has already
loaded .env into os.environ. This avoids the module-level side effect in
log_analysis_agent.py (genai.Client construction) firing too early.
"""

from fastapi import HTTPException

from ai.log_analysis_agent import normalize_analysis_result
from app.models.incident import AnalysisResult
from app.services.incident_service import get_incident_by_id, update_ai_summary


def _coerce_logs(logs) -> str:
    """
    Ensure logs are a plain string regardless of how they are stored in Supabase.
    - str  → returned as-is
    - list → joined with newlines (e.g. ["line1", "line2"] → "line1\nline2")
    - anything else → str() fallback
    """
    if isinstance(logs, list):
        return "\n".join(str(line) for line in logs)
    return str(logs) if logs is not None else ""


def run_analysis(incident_id: str) -> AnalysisResult:
    """
    1. Fetch the incident and its raw logs from Supabase.
    2. Coerce logs to a plain string (handles both str and list storage).
    3. Pass the logs to the Log Analysis Agent.
    4. Persist the result back to ai_summary.
    5. Return a structured AnalysisResult.

    Raises:
        404  — if the incident does not exist.
        422  — if the incident has no logs to analyse.
        500  — if the agent raises or returns an unexpected shape.
    """
    # Deferred import: .env is guaranteed loaded by main.py before any request
    # reaches here, so os.environ["GEMINI_API_KEY"] is set when this line runs.
    from ai.log_analysis_agent import analyze_incident_logs

    # Step 1: Fetch incident (raises 404 if not found)
    incident = get_incident_by_id(incident_id)

    # Step 2: Coerce logs to string
    logs_str = _coerce_logs(incident.logs)
    if not logs_str.strip():
        raise HTTPException(
            status_code=422,
            detail=f"Incident '{incident_id}' has no logs to analyse.",
        )

    # Step 3: Run the Log Analysis Agent
    try:
        result: dict = analyze_incident_logs(logs_str)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Log Analysis Agent failed: {exc}",
        ) from exc

    # Step 4: Normalize and validate the output shape
    result = normalize_analysis_result(result)

    required_keys = {"summary", "probable_severity", "key_error_patterns", "confidence"}
    missing = required_keys - result.keys()
    if missing:
        raise HTTPException(
            status_code=500,
            detail=f"Log Analysis Agent returned incomplete result. Missing keys: {missing}",
        )

    # Step 5: Persist to Supabase
    update_ai_summary(incident_id, result)

    # Step 6: Return typed response
    return AnalysisResult(
        incident_id=incident_id,
        summary=result["summary"],
        probable_severity=result["probable_severity"],
        key_error_patterns=result["key_error_patterns"],
        confidence=float(result["confidence"]),
    )
