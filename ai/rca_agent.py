"""
RCA Agent — Root Cause Analysis

Agent 2 in the multi-agent pipeline.

Input:
  - logs            : raw log text from the incident
  - error_patterns  : list of error patterns from the Log Analysis Agent (Agent 1)
  - similar_incidents: list of similar past incidents with titles and services

Output (JSON):
  {
    "root_cause": "...",
    "contributing_factors": ["...", "..."],
    "confidence": 0.0–1.0
  }
"""

import json
import os

from dotenv import load_dotenv
from google import genai

load_dotenv()

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

_PROMPT_TEMPLATE = """\
You are an expert Site Reliability Engineer performing root cause analysis.

You have been given:
1. Raw logs from a software incident
2. Key error patterns already extracted from those logs
3. A list of similar past incidents for context

Your task is to identify the single most probable root cause of this incident.

Respond ONLY with valid JSON in this exact format:
{{
  "root_cause": "one clear sentence describing the exact root cause",
  "contributing_factors": ["factor 1", "factor 2", "factor 3"],
  "confidence": 0.0
}}

Rules:
- root_cause must be specific and actionable (not vague like "system failure")
- contributing_factors should list 2-4 specific technical factors that led to the root cause
- confidence is a float between 0.0 and 1.0

---

RAW LOGS:
{logs}

---

KEY ERROR PATTERNS (from log analysis):
{error_patterns}

---

SIMILAR PAST INCIDENTS (for context):
{similar_incidents}
"""


def _format_similar(similar: list) -> str:
    if not similar:
        return "No similar past incidents found."
    lines = []
    for i, s in enumerate(similar, 1):
        lines.append(
            f"{i}. [{s.get('incident_id', '?')}] {s.get('title', 'Unknown')} "
            f"(Service: {s.get('service', '?')}, Similarity: {round(s.get('similarity', 0) * 100)}%)"
        )
    return "\n".join(lines)


def analyze_root_cause(
    logs: str,
    error_patterns: list,
    similar_incidents: list,
    max_retries: int = 2,
) -> dict:
    """
    Run the RCA Agent.

    Args:
        logs:              raw incident log text
        error_patterns:    list of strings from the Log Analysis Agent
        similar_incidents: list of dicts with incident_id, title, service, similarity

    Returns:
        dict with root_cause, contributing_factors, confidence
    """
    prompt = _PROMPT_TEMPLATE.format(
        logs=logs,
        error_patterns="\n".join(f"- {p}" for p in error_patterns) or "None identified",
        similar_incidents=_format_similar(similar_incidents),
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
            return {
                "root_cause": "Could not determine root cause from available logs.",
                "contributing_factors": [],
                "confidence": 0.0,
            }


def _normalize(result: dict) -> dict:
    root_cause = str(result.get("root_cause", "")).strip() or "Unknown root cause."

    factors = result.get("contributing_factors", []) or []
    if not isinstance(factors, list):
        factors = [str(factors)]
    contributing_factors = [str(f).strip() for f in factors if str(f).strip()]

    confidence = result.get("confidence", 0)
    try:
        confidence = float(confidence)
    except (TypeError, ValueError):
        confidence = 0.0
    if confidence > 1:
        confidence = confidence / 100.0
    confidence = max(0.0, min(1.0, confidence))

    return {
        "root_cause": root_cause,
        "contributing_factors": contributing_factors,
        "confidence": confidence,
    }
