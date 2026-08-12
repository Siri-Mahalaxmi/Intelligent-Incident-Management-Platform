import { Severity } from "@/types/incident";

const severityConfig: Record<
  Severity,
  { label: string; className: string }
> = {
  CRITICAL: {
    label: "Critical",
    className: "bg-red-100 text-red-800 border border-red-200",
  },
  HIGH: {
    label: "High",
    className: "bg-orange-100 text-orange-800 border border-orange-200",
  },
  MEDIUM: {
    label: "Medium",
    className: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  },
  LOW: {
    label: "Low",
    className: "bg-green-100 text-green-800 border border-green-200",
  },
};

interface SeverityBadgeProps {
  severity: Severity;
}

export default function SeverityBadge({ severity }: SeverityBadgeProps) {
  const config = severityConfig[severity];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}
