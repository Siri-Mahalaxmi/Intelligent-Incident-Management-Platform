export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type Status = "OPEN" | "IN_PROGRESS" | "RESOLVED";

export interface AnalysisResult {
  incident_id?: string;
  summary: string;
  probable_severity: string;
  key_error_patterns: string[];
  confidence: number;
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
}