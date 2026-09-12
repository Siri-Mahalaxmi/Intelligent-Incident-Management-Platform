"""
Resolution Agent — Recommends actions to resolve an incident.

Agent 3 in the multi-agent pipeline.

Input:
  - root_cause            : string from the RCA Agent (Agent 2)
  - contributing_factors  : list of strings from the RCA Agent
  - service               : name of the affected service
  - severity              : incident severity (LOW/MEDIUM/HIGH/CRITICAL)

Output (JSON):
  {
    "immediate_actions": ["...", "..."],
    "long_term_actions": ["...", "..."],
    "estimated_resolution_time": "..."
  }
"""

import json
import os

from dotenv import load_dotenv
from google import genai

load_dotenv()

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

_PROMPT_TEMPLATE = """\
You are an expert Site Reliability Engineer recommending resolution steps for a software incident.

You have been given the root cause and contributing factors identified by a previous analysis agent.

Your task is to recommend clear, specific actions to resolve the incident immediately and prevent recurrence.

Respond ONLY with valid JSON in this exact format:
{{
  "immediate_actions": ["action 1", "action 2", "action 3"],
  "long_term_actions": ["action 1", "action 2"],
  "estimated_resolution_time": "e.g. 15-30 minutes"
}}

Rules:
- immediate_actions: 3-5 specific steps an on-call engineer should take RIGHT NOW
- long_term_actions: 2-3 steps to prevent this from happening again
- estimated_resolution_time: realistic estimate based on the severity and root cause
- All actions must be specific and technical, not vague

---

AFFECTED SERVICE: {service}
SEVERITY: {severity}

ROOT CAUSE:
{root_cause}

CONTRIBUTING FACTORS:
{contributing_factors}
"""


def recommend_resolution(
    root_cause: str,
    contributing_factors: list,
    service: str,
    severity: str,
    max_retries: int = 2,
) -> dict:
    """
    Run the Resolution Agent.

    Args:
        root_cause:           string from the RCA Agent
        contributing_factors: list of strings from the RCA Agent
        service:              name of the affected service
        severity:             incident severity level

    Returns:
        dict with immediate_actions, long_term_actions, estimated_resolution_time
    """
    prompt = _PROMPT_TEMPLATE.format(
        service=service,
        severity=severity,
        root_cause=root_cause,
        contributing_factors="\n".join(
            f"- {f}" for f in contributing_factors
        ) or "None identified",
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
                "immediate_actions": ["Manual investigation required."],
                "long_term_actions": ["Review incident post-mortem."],
                "estimated_resolution_time": "Unknown",
            }


def _normalize(result: dict) -> dict:
    def to_list(val):
        if isinstance(val, list):
            return [str(v).strip() for v in val if str(v).strip()]
        return [str(val).strip()] if val else []

    return {
        "immediate_actions": to_list(result.get("immediate_actions")),
        "long_term_actions": to_list(result.get("long_term_actions")),
        "estimated_resolution_time": str(
            result.get("estimated_resolution_time", "Unknown")
        ).strip(),
    }
