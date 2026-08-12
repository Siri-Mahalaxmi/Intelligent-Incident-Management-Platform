/**
 * incidentsService.ts
 *
 * Mock implementation of all incident-related data operations.
 * Every function is designed so that its internals can be replaced with
 * real fetch() calls to a backend API without changing any call-site code.
 *
 * Swap guide:
 *   - Remove the `mockStore` and `simulateDelay` helpers
 *   - Replace each function body with: return fetch('/api/...').then(r => r.json())
 *   - id and created_at generation moves to the server response
 */

import { Incident, Severity, Status } from "@/types/incident";
import { seedIncidents } from "@/data/seedIncidents";

// ---------------------------------------------------------------------------
// In-memory store (mock only — not used once real API is wired up)
// ---------------------------------------------------------------------------
let mockStore: Incident[] = [...seedIncidents];

function simulateDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateId(): string {
  const maxNum = mockStore.reduce((max, inc) => {
    const num = parseInt(inc.id.replace("INC-", ""), 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, 1000);
  return `INC-${maxNum + 1}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch all incidents.
 * Replace body with: return fetch('/api/incidents').then(r => r.json())
 */
export async function getIncidents(): Promise<Incident[]> {
  await simulateDelay(300);
  return [...mockStore];
}

/**
 * Fetch a single incident by id.
 * Replace body with: return fetch(`/api/incidents/${id}`).then(r => r.json())
 */
export async function getIncidentById(id: string): Promise<Incident | null> {
  await simulateDelay(200);
  return mockStore.find((i) => i.id === id) ?? null;
}

export interface CreateIncidentPayload {
  title: string;
  service: string;
  severity: Severity;
  status: Status;
  description: string;
  logs: string;
}

/**
 * Create a new incident.
 * Replace body with: return fetch('/api/incidents', { method:'POST', body: JSON.stringify(payload) }).then(r => r.json())
 * When real API is used, id and created_at come from the server response.
 */
export async function createIncident(
  payload: CreateIncidentPayload
): Promise<Incident> {
  await simulateDelay(400);

  // Simulate a random error ~10% of the time so the error path can be tested
  if (Math.random() < 0.1) {
    throw new Error("Failed to create incident. Please try again.");
  }

  const newIncident: Incident = {
    ...payload,
    id: generateId(),           // will come from backend later
    created_at: new Date().toISOString(), // will come from backend later
  };

  mockStore = [newIncident, ...mockStore];
  return newIncident;
}

export interface AnalysisResult {
  summary: string;
  probable_severity: string;
  key_error_patterns: string[];
  confidence: number;
}

/**
 * Analyze an incident with AI.
 * Replace body with: return fetch(`/api/incidents/${id}/analyze`, { method:'POST' }).then(r => r.json())
 */
export async function analyzeIncident(id: string): Promise<AnalysisResult> {
  await simulateDelay(1800); // simulate LLM latency

  const incident = mockStore.find((i) => i.id === id);
  if (!incident) throw new Error(`Incident ${id} not found`);

  // Deterministic mock responses keyed by incident so results feel realistic
  const mockResults: Record<string, AnalysisResult> = {
    "INC-1001": {
      summary:
        "Database connection pool exhaustion is causing cascading payment failures. The pool limit of 100 connections has been reached, likely due to a slow query or connection leak introduced in a recent release.",
      probable_severity: "HIGH",
      key_error_patterns: [
        "SQLTransientConnectionException: Timeout after 30000ms",
        "Active database connections: 100/100",
        "Average query latency increased from 120ms to 2400ms",
        "Connection utilization reached maximum capacity",
      ],
      confidence: 0.91,
    },
    "INC-1002": {
      summary:
        "Checkout service is experiencing cascading timeouts caused by a degraded Inventory Service dependency. Thread pool saturation is amplifying the impact and creating a retry storm.",
      probable_severity: "CRITICAL",
      key_error_patterns: [
        "Inventory Service response time exceeded threshold",
        "TimeoutException on dependency call",
        "Thread pool utilization: 92%",
        "Retry queue size increased to 427",
        "HTTP 504 Gateway Timeout",
      ],
      confidence: 0.96,
    },
    "INC-1003": {
      summary:
        "Missing JWT_SECRET environment variable in the v2.8.0 deployment is causing authentication module initialization failure, resulting in 100% error rate for login requests.",
      probable_severity: "HIGH",
      key_error_patterns: [
        "Missing required configuration property: JWT_SECRET",
        "NullPointerException: JWT secret is null",
        "Authentication module initialization failed",
        "Error rate increased from 0.2% to 38.7%",
      ],
      confidence: 0.98,
    },
  };

  return (
    mockResults[id] ?? {
      summary:
        "Elevated error rate detected. Review logs for root cause. No specific pattern matched — manual investigation recommended.",
      probable_severity: incident.severity,
      key_error_patterns: ["Elevated error rate", "Service degradation detected"],
      confidence: 0.55,
    }
  );
}
