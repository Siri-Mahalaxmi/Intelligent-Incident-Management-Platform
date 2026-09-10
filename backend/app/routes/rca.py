"""
RCA routes.

POST /incidents/{incident_id}/rca — run the full 3-agent RCA pipeline
"""

from fastapi import APIRouter

from app.models.incident import RCAResult
from app.services.rca_service import run_rca

router = APIRouter(prefix="/incidents", tags=["RCA"])


@router.post("/{incident_id}/rca", response_model=RCAResult)
def rca_incident(incident_id: str):
    """
    Run the multi-agent Root Cause Analysis pipeline on an incident.

    Executes three sequential AI agents:
    - **Agent 1** (Log Analysis): Extracts error patterns from raw logs
    - **Agent 2** (RCA): Identifies root cause using logs + similar past incidents
    - **Agent 3** (Resolution): Recommends immediate and long-term actions

    Results are persisted to the `rca_result` column in Supabase.

    - **incident_id**: human-readable ID, e.g. `INC-1001`
    """
    return run_rca(incident_id)
