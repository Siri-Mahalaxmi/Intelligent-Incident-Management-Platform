"""
Report Agent — generates a structured incident post-mortem report.

Agent 4 in the pipeline (runs after RCA + Resolution).

Input:
  - incident       : dict with title, service, severity, status, description, logs
  - log_analysis   : Agent 1 output (summary, probable_severity, key_error_patterns, confidence)
  - rca            : Agent 2 output (root_cause, contributing_factors, confidence)
  - resolution     : Agent 3 output (immediate_actions, long_term_actions, estimated_resolution_time)
  - similar_incidents : list of similar past incidents from pgvector

Output (JSON):
  {
    "executive_summary": "...",
    "what_happened": "...",
    "root_cause": "...",
    "evidence": ["...", "..."],
    "resolution_steps_taken": ["...", "..."],
    "similar_incidents_referenced": ["...", "..."],
    "prevention_recommendations": ["...", "..."],
    "severity_assessment": "...",
    "estimated_impact": "..."
  }
"""

import json
import os

from dotenv import load_dotenv
from google import genai

load_dotenv()

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

_PROMPT_TEMPLATE = """\
You are a senior Site Reliability Engineer writing a formal incident post-mortem report.

You have been given the complete analysis of a production incident including logs, root cause analysis, and resolution steps.

Your task is to generate a clear, structured incident report suitable for engineering leadership and post-mortem review.

Respond ONLY with valid JSON in this exact format:
{{
  "executive_summary": "2-3 sentence non-technical summary of what happened and its impact",
  "what_happened": "detailed technical narrative of the incident timeline",
  "root_cause": "clear statement of the confirmed root cause",
  "evidence": ["log line or pattern 1", "log line or pattern 2", "log line or pattern 3"],
  "resolution_steps_taken": ["step 1 taken to resolve", "step 2 taken to resolve"],
  "similar_incidents_referenced": ["reference 1", "reference 2"],
  "prevention_recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "severity_assessment": "justification for the severity level assigned",
  "estimated_impact": "description of user/business impact during the incident"
}}

Rules:
- executive_summary must be readable by non-technical stakeholders
- evidence must be specific log patterns or error messages from the logs
- resolution_steps_taken should reflect the immediate actions from the resolution plan
- similar_incidents_referenced should mention past incidents if any were found
- prevention_recommendations must be concrete and actionable
- estimated_impact should quantify users/services affected where possible

---

INCIDENT TITLE: {title}
SERVICE: {service}
SEVERITY: {severity}
STATUS: {status}

INCIDENT DESCRIPTION:
{description}

RAW LOGS (excerpt):
{logs}

---

LOG ANALYSIS (Agent 1):
Summary: {log_summary}
Probable Severity: {log_severity}
Key Error Patterns:
{error_patterns}
Confidence: {log_confidence}%

---

ROOT CAUSE ANALYSIS (Agent 2):
Root Cause: {root_cause}
Contributing Factors:
{contributing_factors}
RCA Confidence: {rca_confidence}%

---

RESOLUTION PLAN (Agent 3):
Immediate Actions:
{immediate_actions}
Long-Term Prevention:
{long_term_actions}
Estimated Resolution Time: {eta}

---

SIMILAR PAST INCIDENTS:
{similar_incidents}
"""


def _fmt_list(items: list, bullet: str = "-") -> str:
    if not items:
        return "None identified."
    return "\n".join(f"{bullet} {item}" for item in items)


def _fmt_similar(similar: list) -> str:
    if not similar:
        return "No similar past incidents found."
    lines = []
    for i, s in enumerate(similar, 1):
        lines.append(
            f"{i}. [{s.get('incident_id', '?')}] {s.get('title', 'Unknown')} "
            f"(Service: {s.get('service', '?')}, "
            f"Similarity: {round(s.get('similarity', 0) * 100)}%)"
        )
    return "\n".join(lines)


def generate_report(
    incident: dict,
    log_analysis: dict,
    rca: dict,
    resolution: dict,
    similar_incidents: list | None = None,
    max_retries: int = 2,
) -> dict:
    """
    Run the Report Agent.

    Args:
        incident:           dict with title, service, severity, status, description, logs
        log_analysis:       Agent 1 output dict
        rca:                Agent 2 output dict
        resolution:         Agent 3 output dict
        similar_incidents:  list of similar past incident dicts (optional)

    Returns:
        dict with all report fields
    """
    if similar_incidents is None:
        similar_incidents = []

    logs_text = incident.get("logs", "") or ""
    # Truncate very long logs to keep prompt size reasonable
    if len(logs_text) > 3000:
        logs_text = logs_text[:3000] + "\n... [truncated]"

    prompt = _PROMPT_TEMPLATE.format(
        title=incident.get("title", "Unknown"),
        service=incident.get("service", "Unknown"),
        severity=incident.get("severity", "UNKNOWN"),
        status=incident.get("status", "UNKNOWN"),
        description=incident.get("description", "No description provided."),
        logs=logs_text,
        log_summary=log_analysis.get("summary", ""),
        log_severity=log_analysis.get("probable_severity", "UNKNOWN"),
        error_patterns=_fmt_list(log_analysis.get("key_error_patterns", [])),
        log_confidence=round(float(log_analysis.get("confidence", 0)) * 100),
        root_cause=rca.get("root_cause", ""),
        contributing_factors=_fmt_list(rca.get("contributing_factors", [])),
        rca_confidence=round(float(rca.get("confidence", 0)) * 100),
        immediate_actions=_fmt_list(resolution.get("immediate_actions", []), bullet="1."),
        long_term_actions=_fmt_list(resolution.get("long_term_actions", []), bullet="1."),
        eta=resolution.get("estimated_resolution_time", "Unknown"),
        similar_incidents=_fmt_similar(similar_incidents),
    )

    for attempt in range(max_retries + 1):
        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
            },
        )
        try:
            parsed = json.loads(response.text)
            return _normalize(parsed)
        except json.JSONDecodeError:
            if attempt < max_retries:
                continue
            # Fallback: return a minimal report from the existing data
            return _fallback_report(incident, log_analysis, rca, resolution)


def _normalize(result: dict) -> dict:
    def to_str(val: object) -> str:
        return str(val).strip() if val else ""

    def to_list(val: object) -> list:
        if isinstance(val, list):
            return [str(v).strip() for v in val if str(v).strip()]
        return [str(val).strip()] if val else []

    return {
        "executive_summary": to_str(result.get("executive_summary")),
        "what_happened": to_str(result.get("what_happened")),
        "root_cause": to_str(result.get("root_cause")),
        "evidence": to_list(result.get("evidence")),
        "resolution_steps_taken": to_list(result.get("resolution_steps_taken")),
        "similar_incidents_referenced": to_list(result.get("similar_incidents_referenced")),
        "prevention_recommendations": to_list(result.get("prevention_recommendations")),
        "severity_assessment": to_str(result.get("severity_assessment")),
        "estimated_impact": to_str(result.get("estimated_impact")),
    }


def _fallback_report(
    incident: dict,
    log_analysis: dict,
    rca: dict,
    resolution: dict,
) -> dict:
    """Minimal report built from existing pipeline data when LLM parse fails."""
    return {
        "executive_summary": log_analysis.get("summary", "Incident analysis complete."),
        "what_happened": incident.get("description", "See logs for details."),
        "root_cause": rca.get("root_cause", "Root cause under investigation."),
        "evidence": log_analysis.get("key_error_patterns", []),
        "resolution_steps_taken": resolution.get("immediate_actions", []),
        "similar_incidents_referenced": [],
        "prevention_recommendations": resolution.get("long_term_actions", []),
        "severity_assessment": f"Assessed as {incident.get('severity', 'UNKNOWN')} based on impact.",
        "estimated_impact": f"Service affected: {incident.get('service', 'Unknown')}",
    }
