export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type Status = "OPEN" | "IN_PROGRESS" | "RESOLVED";

export interface AnalysisResult {
  incident_id?: string;
  summary: string;
  probable_severity: string;
  key_error_patterns: string[];
  confidence: number;
}

export interface SimilarIncident {
  incident_id: string;
  title: string;
  service: string;
  severity: string;
  status: string;
  created_at: string;
  similarity: number; // cosine similarity 0–1
}

export interface SimilarIncidentsResponse {
  incident_id: string;
  similar: SimilarIncident[];
}

// ---------------------------------------------------------------------------
// Multi-agent RCA types
// ---------------------------------------------------------------------------

export interface RCALogAnalysis {
  summary: string;
  probable_severity: string;
  key_error_patterns: string[];
  confidence: number;
}

export interface RCASummary {
  root_cause: string;
  contributing_factors: string[];
  confidence: number;
}

export interface ResolutionSummary {
  immediate_actions: string[];
  long_term_actions: string[];
  estimated_resolution_time: string;
}

export interface RCAResult {
  incident_id: string;
  log_analysis: RCALogAnalysis;
  rca: RCASummary;
  resolution: ResolutionSummary;
  pipeline_version: string;
}

export interface Incident {
  id: string;
  incident_id?: string;
  title: string;
  service: string;
  severity: Severity;
  status: Status;
  description: string;
  logs: string;
  created_at: string;
  ai_summary?: AnalysisResult | null;
  rca_result?: RCAResult | null;
  report_result?: ReportResult | null;
}

// ---------------------------------------------------------------------------
// Report Agent types
// ---------------------------------------------------------------------------

export interface ReportResult {
  incident_id: string;
  executive_summary: string;
  what_happened: string;
  root_cause: string;
  evidence: string[];
  resolution_steps_taken: string[];
  similar_incidents_referenced: string[];
  prevention_recommendations: string[];
  severity_assessment: string;
  estimated_impact: string;
}