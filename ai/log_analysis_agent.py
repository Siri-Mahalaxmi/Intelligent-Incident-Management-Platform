import json
import os

from dotenv import load_dotenv
from google import genai

load_dotenv()  # reads .env and loads variables into environment

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

PROMPT_TEMPLATE = """You are an incident analysis assistant. Given raw logs from a software incident, respond ONLY with valid JSON in this exact format:

{{
  "summary": "one or two sentence plain-English summary of what happened",
  "probable_severity": "Low | Medium | High | Critical",
  "key_error_patterns": ["pattern 1", "pattern 2"],
  "confidence": 0
}}

Logs:
{logs}
"""


def normalize_analysis_result(result: dict) -> dict:
    """Normalize Gemini output into the app's expected schema."""
    if not isinstance(result, dict):
        raise ValueError("AI analysis must return an object.")

    summary = str(result.get("summary", "")).strip() or "No summary available."

    severity = str(result.get("probable_severity", "")).strip()
    if not severity:
        severity = "Medium"
    severity = severity.upper()
    if severity not in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}:
        severity = "MEDIUM"

    patterns = result.get("key_error_patterns", []) or []
    if not isinstance(patterns, list):
        patterns = [str(patterns)]
    key_error_patterns = [str(item).strip() for item in patterns if str(item).strip()]

    confidence = result.get("confidence", 0)
    try:
        confidence_value = float(confidence)
    except (TypeError, ValueError):
        confidence_value = 0.0

    if confidence_value > 1:
        confidence_value = confidence_value / 100.0

    confidence_value = max(0.0, min(1.0, confidence_value))

    return {
        "summary": summary,
        "probable_severity": severity,
        "key_error_patterns": key_error_patterns,
        "confidence": confidence_value,
    }


def analyze_incident_logs(logs: str, max_retries: int = 2) -> dict:
    prompt = PROMPT_TEMPLATE.format(logs=logs)

    for attempt in range(max_retries + 1):
        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
            },
        )
        try:
            parsed = json.loads(response.text)
            return normalize_analysis_result(parsed)
        except json.JSONDecodeError:
            if attempt < max_retries:
                continue  # try again
            print("RAW RESPONSE THAT FAILED TO PARSE (final attempt):")
            print(repr(response.text))
            return {
                "summary": "Could not parse AI response",
                "probable_severity": "MEDIUM",
                "key_error_patterns": [],
                "confidence": 0.0,
            }