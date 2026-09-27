/**
 * incidentsService.ts
 * All incident-related API calls — now uses apiClient for auth headers.
 */

import { apiRequest } from "@/services/apiClient";
import {
  Incident,
  Severity,
  Status,
  AnalysisResult,
  SimilarIncidentsResponse,
  RCAResult,
  ReportResult,
} from "@/types/incident";

/**
 * Normalize AI analysis so key_error_patterns is always an array,
 * probable_severity is uppercase, confidence is in 0–1 range.
 */
function normalizeAnalysisResult(
  result: Partial<AnalysisResult> | null | undefined
): AnalysisResult {
  const severity = String(result?.probable_severity ?? "MEDIUM").trim().toUpperCase();
  const confidence = Number(result?.confidence ?? 0);
  const validSeverities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

  return {
    incident_id: result?.incident_id,
    summary: result?.summary ?? "",
    probable_severity: validSeverities.includes(severity as (typeof validSeverities)[number])
      ? severity
      : "MEDIUM",
    key_error_patterns: Array.isArray(result?.key_error_patterns)
      ? result.key_error_patterns
      : [],
    confidence: confidence > 1 ? confidence / 100 : confidence,
  };
}

export async function getIncidents(): Promise<Incident[]> {
  return apiRequest<Incident[]>("/incidents");
}

export async function getIncidentById(id: string): Promise<Incident | null> {
  try {
    const incident = await apiRequest<Incident>(`/incidents/${encodeURIComponent(id)}`);
    return {
      ...incident,
      ai_summary: incident.ai_summary ? normalizeAnalysisResult(incident.ai_summary) : null,
    };
  } catch (error) {
    console.error("Failed to fetch incident:", error);
    return null;
  }
}

export interface CreateIncidentPayload {
  title: string;
  service: string;
  severity: Severity;
  status: Status;
  description: string;
  logs: string;
}

export async function createIncident(payload: CreateIncidentPayload): Promise<Incident> {
  return apiRequest<Incident>("/incidents", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function analyzeIncident(id: string): Promise<AnalysisResult> {
  const result = await apiRequest<AnalysisResult>(
    `/incidents/${encodeURIComponent(id)}/analyze`,
    { method: "POST" }
  );
  return normalizeAnalysisResult(result);
}

export async function getSimilarIncidents(
  id: string,
  threshold = 0.5,
  limit = 3
): Promise<SimilarIncidentsResponse> {
  return apiRequest<SimilarIncidentsResponse>(
    `/incidents/${encodeURIComponent(id)}/similar?threshold=${threshold}&limit=${limit}`,
    { method: "POST" }
  );
}

export async function runRCA(id: string): Promise<RCAResult> {
  return apiRequest<RCAResult>(`/incidents/${encodeURIComponent(id)}/rca`, { method: "POST" });
}

export async function generateReport(id: string): Promise<ReportResult> {
  return apiRequest<ReportResult>(`/incidents/${encodeURIComponent(id)}/report`, { method: "POST" });
}

export async function updateIncidentStatus(id: string, status: Status): Promise<Incident> {
  return apiRequest<Incident>(
    `/incidents/${encodeURIComponent(id)}/status`,
    { method: "PATCH", body: JSON.stringify({ status }) }
  );
}
