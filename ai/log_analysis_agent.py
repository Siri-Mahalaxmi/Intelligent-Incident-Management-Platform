import os
import json
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

def analyze_incident_logs(logs: str, max_retries: int = 2) -> dict:
    prompt = PROMPT_TEMPLATE.format(logs=logs)

    for attempt in range(max_retries + 1):
        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "temperature": 0.3
                }
        )
        try:
            return json.loads(response.text)
        except json.JSONDecodeError:
            if attempt < max_retries:
                continue  # try again
            print("RAW RESPONSE THAT FAILED TO PARSE (final attempt):")
            print(repr(response.text))
            return {
                "summary": "Could not parse AI response",
                "probable_severity": "Unknown",
                "key_error_patterns": [],
                "confidence": 0
            }