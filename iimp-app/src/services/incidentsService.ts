/**
 * incidentsService.ts
 *
 * Handles all incident-related API calls.
 */

import {
  Incident,
  Severity,
  Status,
  AnalysisResult,
} from "@/types/incident";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);

    throw new Error(
      errorBody?.detail ?? `Request failed (${response.status})`
    );
  }

  return (await response.json()) as T;
}

/**
 * Safely normalizes the AI analysis returned by the backend.
 *
 * This prevents the frontend from crashing if fields such as
 * key_error_patterns are missing or malformed.
 */
function normalizeAnalysisResult(
  result: Partial<AnalysisResult> | null | undefined
): AnalysisResult {
  const severity = String(
    result?.probable_severity ?? "MEDIUM"
  )
    .trim()
    .toUpperCase();

  const confidence = Number(result?.confidence ?? 0);

  const validSeverities = [
    "LOW",
    "MEDIUM",
    "HIGH",
    "CRITICAL",
  ] as const;

  return {
    incident_id: result?.incident_id,

    summary: result?.summary ?? "",

    probable_severity: validSeverities.includes(
      severity as (typeof validSeverities)[number]
    )
      ? severity
      : "MEDIUM",

    key_error_patterns: Array.isArray(result?.key_error_patterns)
      ? result.key_error_patterns
      : [],

    confidence:
      confidence > 1
        ? confidence / 100
        : confidence,
  };
}

// ---------------------------------------------------------------------------
// Get all incidents
// ---------------------------------------------------------------------------

export async function getIncidents(): Promise<Incident[]> {
  return apiRequest<Incident[]>("/incidents");
}

// ---------------------------------------------------------------------------
// Get one incident
// ---------------------------------------------------------------------------

export async function getIncidentById(
  id: string
): Promise<Incident | null> {
  try {
    const incident = await apiRequest<Incident>(
      `/incidents/${encodeURIComponent(id)}`
    );
    // Normalize ai_summary so restored analysis is always in the same shape
    // as a freshly-run analysis: probable_severity uppercased, key_error_patterns
    // guaranteed to be an array, confidence in 0-1 range.
    return {
      ...incident,
      ai_summary: incident.ai_summary
        ? normalizeAnalysisResult(incident.ai_summary)
        : null,
    };
  } catch (error) {
    console.error("Failed to fetch incident:", error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Create incident
// ---------------------------------------------------------------------------

export interface CreateIncidentPayload {
  title: string;
  service: string;
  severity: Severity;
  status: Status;
  description: string;
  logs: string;
}

export async function createIncident(
  payload: CreateIncidentPayload
): Promise<Incident> {
  return apiRequest<Incident>("/incidents", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// Analyze incident
// ---------------------------------------------------------------------------

export async function analyzeIncident(
  id: string
): Promise<AnalysisResult> {
  const result = await apiRequest<AnalysisResult>(
    `/incidents/${encodeURIComponent(id)}/analyze`,
    {
      method: "POST",
    }
  );

  return normalizeAnalysisResult(result);
}