"""
Incident routes.

GET /incidents               — list all incidents (summary view)
GET /incidents/{incident_id} — full detail for one incident
"""

from typing import List

from fastapi import APIRouter

from app.models.incident import IncidentDetail, IncidentSummary
from app.services.incident_service import create_incident, get_all_incidents, get_incident_by_id

router = APIRouter(prefix="/incidents", tags=["Incidents"])


@router.get("", response_model=List[IncidentSummary])
def list_incidents():
    """Return all incidents ordered by creation date (newest first)."""
    return get_all_incidents()


@router.post("", response_model=IncidentDetail)
def create_incident_route(payload: dict):
    """Create a new incident and return it."""
    return create_incident(payload)


@router.get("/{incident_id}", response_model=IncidentDetail)
def get_incident(incident_id: str):
    """
    Return full detail for a single incident.

    - **incident_id**: human-readable ID, e.g. `INC-1001`
    """
    return get_incident_by_id(incident_id)
