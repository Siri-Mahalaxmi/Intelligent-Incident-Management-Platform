"""
Incident routes.

GET   /incidents               — list all incidents (summary view)
GET   /incidents/{incident_id} — full detail for one incident
POST  /incidents               — create a new incident
PATCH /incidents/{incident_id}/status — update incident status
"""

from typing import List

from fastapi import APIRouter

from app.models.incident import IncidentDetailFull, IncidentSummary
from app.services.incident_service import (
    create_incident,
    get_all_incidents,
    get_incident_by_id,
    update_status,
)

router = APIRouter(prefix="/incidents", tags=["Incidents"])


@router.get("", response_model=List[IncidentSummary])
def list_incidents():
    """Return all incidents ordered by creation date (newest first)."""
    return get_all_incidents()


@router.post("", response_model=IncidentDetailFull)
def create_incident_route(payload: dict):
    """Create a new incident and return it."""
    return create_incident(payload)


@router.get("/{incident_id}", response_model=IncidentDetailFull)
def get_incident(incident_id: str):
    """
    Return full detail for a single incident.

    - **incident_id**: human-readable ID, e.g. `INC-1001`
    """
    return get_incident_by_id(incident_id)


@router.patch("/{incident_id}/status", response_model=IncidentSummary)
def update_incident_status(incident_id: str, payload: dict):
    """
    Update the status of an incident.

    Payload: `{ "status": "OPEN" | "IN_PROGRESS" | "RESOLVED" }`

    - **incident_id**: human-readable ID, e.g. `INC-1001`
    """
    return update_status(incident_id, payload.get("status", ""))
