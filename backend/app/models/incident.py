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


class SimilarIncident(BaseModel):
    """One entry in the similar-incidents list returned by the search endpoint."""

    incident_id: str
    title: str
    service: str
    severity: str
    status: str
    created_at: datetime
    similarity: float  # cosine similarity in [0, 1]; 1 = identical


class SimilarIncidentsResponse(BaseModel):
    """Shape returned by POST /incidents/{incident_id}/similar."""

    incident_id: str
    similar: List[SimilarIncident]


# ---------------------------------------------------------------------------
# Multi-agent RCA pipeline models
# ---------------------------------------------------------------------------

class LogAnalysisSummary(BaseModel):
    """Agent 1 output — extracted from log_analysis_agent.py."""

    summary: str
    probable_severity: str
    key_error_patterns: List[str]
    confidence: float


class RCASummary(BaseModel):
    """Agent 2 output — root cause from rca_agent.py."""

    root_cause: str
    contributing_factors: List[str]
    confidence: float


class ResolutionSummary(BaseModel):
    """Agent 3 output — recommended actions from resolution_agent.py."""

    immediate_actions: List[str]
    long_term_actions: List[str]
    estimated_resolution_time: str


class RCAResult(BaseModel):
    """Full pipeline result returned by POST /incidents/{incident_id}/rca."""

    incident_id: str
    log_analysis: LogAnalysisSummary
    rca: RCASummary
    resolution: ResolutionSummary
    pipeline_version: str


class IncidentDetailWithRCA(IncidentDetail):
    """IncidentDetail extended with the optional RCA pipeline result."""

    rca_result: Optional[Any] = None  # JSONB; None until /rca is called


# ---------------------------------------------------------------------------
# Report Agent model
# ---------------------------------------------------------------------------

class ReportResult(BaseModel):
    """Full incident post-mortem report returned by POST /incidents/{id}/report."""

    incident_id: str
    executive_summary: str
    what_happened: str
    root_cause: str
    evidence: List[str]
    resolution_steps_taken: List[str]
    similar_incidents_referenced: List[str]
    prevention_recommendations: List[str]
    severity_assessment: str
    estimated_impact: str


class IncidentDetailFull(IncidentDetailWithRCA):
    """Full incident including report_result — returned by GET /incidents/{id}."""

    report_result: Optional[Any] = None  # JSONB; None until /report is called
