"""
Incident service — all direct Supabase queries live here.
Routes stay thin; this layer owns the DB interaction.

All public functions now accept an optional `organization_id` parameter.
When provided, queries are scoped to that organization (org user path).
When None, queries are unscoped (central_admin path).
"""

import re
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException
from postgrest.exceptions import APIError

from app.database import supabase_client
from app.models.incident import IncidentDetailFull, IncidentSummary

# Columns returned for the list endpoint (keeps payload small)
_LIST_COLUMNS = "id, incident_id, title, service, severity, status, created_at, organization_id"

# All columns for the detail endpoint
_DETAIL_COLUMNS = (
    "id, incident_id, title, service, severity, status, "
    "description, logs, created_at, ai_summary, rca_result, report_result, "
    "organization_id, created_by"
)


def get_all_incidents(organization_id: Optional[str] = None) -> List[IncidentSummary]:
    """
    Return a summary list of incidents, ordered newest first.
    If organization_id is provided, scoped to that org only.
    """
    query = (
        supabase_client.table("incidents")
        .select(_LIST_COLUMNS)
        .order("created_at", desc=True)
    )
    if organization_id:
        query = query.eq("organization_id", organization_id)

    response = query.execute()
    return [IncidentSummary(**row) for row in response.data]


def get_incident_by_id(
    incident_id: str,
    organization_id: Optional[str] = None,
) -> IncidentDetailFull:
    """
    Fetch a single incident by its human-readable ID (e.g. 'INC-1001').
    If organization_id is provided, also filters by org (prevents cross-org access).
    Raises 404 if not found or not accessible.
    """
    try:
        query = (
            supabase_client.table("incidents")
            .select(_DETAIL_COLUMNS)
            .eq("incident_id", incident_id)
        )
        if organization_id:
            query = query.eq("organization_id", organization_id)

        response = query.single().execute()
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
    return IncidentDetailFull(**response.data)


def _next_incident_id() -> str:
    """Generate the next human-friendly incident ID, e.g. INC-1006."""
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


def create_incident(
    payload: dict,
    organization_id: Optional[str] = None,
    created_by: Optional[str] = None,
) -> IncidentDetailFull:
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
    if organization_id:
        row["organization_id"] = organization_id
    if created_by:
        row["created_by"] = created_by

    response = supabase_client.table("incidents").insert(row).execute()
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create incident.")

    return get_incident_by_id(incident_id)


def update_ai_summary(incident_id: str, summary: dict) -> None:
    """Write AI analysis result back to the ai_summary column."""
    supabase_client.table("incidents").update({"ai_summary": summary}).eq(
        "incident_id", incident_id
    ).execute()


def update_report_result(incident_id: str, report: dict) -> None:
    """Write Report Agent result back to the report_result column."""
    supabase_client.table("incidents").update({"report_result": report}).eq(
        "incident_id", incident_id
    ).execute()


def update_status(
    incident_id: str,
    status: str,
    organization_id: Optional[str] = None,
) -> IncidentSummary:
    """
    Update the status of an incident. Returns the updated summary row.
    If organization_id is provided, also verifies org ownership.
    Raises 404 if the incident does not exist or is not accessible.
    Raises 422 if the status value is invalid.
    """
    valid = {"OPEN", "IN_PROGRESS", "RESOLVED"}
    if status not in valid:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid status '{status}'. Must be one of: {sorted(valid)}",
        )

    # Confirm the incident exists and is accessible
    get_incident_by_id(incident_id, organization_id=organization_id)

    supabase_client.table("incidents").update({"status": status}).eq(
        "incident_id", incident_id
    ).execute()

    # Re-fetch and return the updated summary
    response = (
        supabase_client.table("incidents")
        .select(_LIST_COLUMNS)
        .eq("incident_id", incident_id)
        .single()
        .execute()
    )
    return IncidentSummary(**response.data)
