"""
Incident service — all direct Supabase queries live here.
Routes stay thin; this layer owns the DB interaction.
"""

from typing import List, Optional
from fastapi import HTTPException

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
    response = (
        supabase_client.table("incidents")
        .select(_DETAIL_COLUMNS)
        .eq("incident_id", incident_id)
        .single()
        .execute()
    )
    if not response.data:
        raise HTTPException(
            status_code=404, detail=f"Incident '{incident_id}' not found."
        )
    return IncidentDetail(**response.data)


def update_ai_summary(incident_id: str, summary: dict) -> None:
    """
    Write the AI analysis result back to the ai_summary column.
    Called after a successful analysis so results are persisted.
    """
    supabase_client.table("incidents").update({"ai_summary": summary}).eq(
        "incident_id", incident_id
    ).execute()
