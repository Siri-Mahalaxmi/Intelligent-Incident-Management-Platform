import { Severity } from "@/types/incident";

const severityConfig: Record<
  Severity,
  { label: string; className: string; dot: string }
> = {
  CRITICAL: {
    label: "Critical",
    className:
      "bg-red-50 text-red-700 ring-1 ring-red-200",
    dot: "bg-red-500",
  },
  HIGH: {
    label: "High",
    className:
      "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
    dot: "bg-orange-500",
  },
  MEDIUM: {
    label: "Medium",
    className:
      "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    dot: "bg-amber-500",
  },
  LOW: {
    label: "Low",
    className:
      "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    dot: "bg-emerald-500",
  },
};

interface SeverityBadgeProps {
  severity: Severity;
  size?: "sm" | "md";
}

export default function SeverityBadge({
  severity,
  size = "sm",
}: SeverityBadgeProps) {
  const config = severityConfig[severity];
  const padding = size === "md" ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${padding} ${config.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
