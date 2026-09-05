"""
Incident service — all direct Supabase queries live here.
Routes stay thin; this layer owns the DB interaction.
"""

import re
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException
from postgrest.exceptions import APIError

from app.database import supabase_client
from app.models.incident import IncidentDetail, IncidentSummary

# Columns returned for the list endpoint (keeps payload small)
_LIST_COLUMNS = "id, incident_id, title, service, severity, status, created_at"

# All columns for the detail endpoint
_DETAIL_COLUMNS = (
    "id, incident_id, title, service, severity, status, "
    "description, logs, created_at, ai_summary"
)


def get_all_incidents() -> List[IncidentSummary]:
    """Return a summary list of every incident, ordered newest first."""
    response = (
        supabase_client.table("incidents")
        .select(_LIST_COLUMNS)
        .order("created_at", desc=True)
        .execute()
    )
    return [IncidentSummary(**row) for row in response.data]


def get_incident_by_id(incident_id: str) -> IncidentDetail:
    """
    Fetch a single incident by its human-readable ID (e.g. 'INC-1001').
    Raises 404 if not found.
    """
    try:
        response = (
            supabase_client.table("incidents")
            .select(_DETAIL_COLUMNS)
            .eq("incident_id", incident_id)
            .single()
            .execute()
        )
    except APIError as exc:
        message = str(exc)
        if "PGRST116" in message or "0 rows" in message.lower():
            raise HTTPException(
                status_code=404, detail=f"Incident '{incident_id}' not found."
            ) from exc
        raise

    if not response.data:
        raise HTTPException(
            status_code=404, detail=f"Incident '{incident_id}' not found."
        )
    return IncidentDetail(**response.data)


def _next_incident_id() -> str:
    """Generate the next human-friendly incident ID, e.g. INC-1004."""
    try:
        response = (
            supabase_client.table("incidents")
            .select("incident_id")
            .execute()
        )
    except Exception:
        return "INC-1001"

    max_num = 0
    for row in response.data or []:
        value = str(row.get("incident_id", ""))
        match = re.search(r"(\d+)$", value)
        if match:
            max_num = max(max_num, int(match.group(1)))

    return f"INC-{max_num + 1}"


def create_incident(payload: dict) -> IncidentDetail:
    """Create a new incident row in Supabase and return it."""
    incident_id = _next_incident_id()
    created_at = datetime.now(timezone.utc).isoformat()

    row = {
        "incident_id": incident_id,
        "title": payload["title"],
        "service": payload["service"],
        "severity": payload["severity"],
        "status": payload["status"],
        "description": payload.get("description", ""),
        "logs": payload.get("logs", ""),
        "created_at": created_at,
    }

    response = supabase_client.table("incidents").insert(row).execute()
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create incident.")

    return get_incident_by_id(incident_id)


def update_ai_summary(incident_id: str, summary: dict) -> None:
    """
    Write the AI analysis result back to the ai_summary column.
    Called after a successful analysis so results are persisted.
    """
    supabase_client.table("incidents").update({"ai_summary": summary}).eq(
        "incident_id", incident_id
    ).execute()
