"""
Pydantic schemas for the incidents table and the AI analysis response.
These are used for response serialisation — they do NOT drive the DB schema.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel


class IncidentSummary(BaseModel):
    """Lightweight view returned by GET /incidents (list endpoint)."""

    id: str
    incident_id: str
    title: str
    service: str
    severity: str
    status: str
    created_at: datetime


class IncidentDetail(BaseModel):
    """Full incident detail returned by GET /incidents/{incident_id}."""

    id: str
    incident_id: str
    title: str
    service: str
    severity: str
    status: str
    description: Optional[str] = None
    logs: Optional[str] = None
    created_at: datetime
    ai_summary: Optional[Any] = None  # stored as JSONB; may be None before analysis


class AnalysisResult(BaseModel):
    """Shape returned by POST /incidents/{incident_id}/analyze."""

    incident_id: str
    summary: str
    probable_severity: str
    key_error_patterns: List[str]
    confidence: float
