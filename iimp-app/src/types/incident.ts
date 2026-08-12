export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type Status = "OPEN" | "IN_PROGRESS" | "RESOLVED";

export interface Incident {
  id: string;
  title: string;
  service: string;
  severity: Severity;
  status: Status;
  description: string;
  logs: string;
  created_at: string;
}
