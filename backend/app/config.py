"""
Validates required environment variables and exposes them as module-level constants.

.env loading is handled in app/main.py BEFORE any imports, so that
ai/log_analysis_agent.py (which reads os.environ at module level) gets the
correct values when it is first imported.
"""

import os


def _require(key: str) -> str:
    value = os.getenv(key)
    if not value:
        raise RuntimeError(
            f"Missing required environment variable: {key}. "
            "Copy .env.example to .env and fill in the values."
        )
    return value


SUPABASE_URL: str = _require("SUPABASE_URL")
SUPABASE_SERVICE_KEY: str = _require("SUPABASE_SERVICE_KEY")
GEMINI_API_KEY: str = _require("GEMINI_API_KEY")
