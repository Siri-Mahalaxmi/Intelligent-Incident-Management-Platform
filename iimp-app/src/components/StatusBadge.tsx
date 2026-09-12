import { Status } from "@/types/incident";

const statusConfig: Record<
  Status,
  { label: string; className: string; dot: string }
> = {
  OPEN: {
    label: "Open",
    className: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    dot: "bg-blue-500",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
    dot: "bg-violet-500",
  },
  RESOLVED: {
    label: "Resolved",
    className: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
    dot: "bg-slate-400",
  },
};

interface StatusBadgeProps {
  status: Status;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig["OPEN"];
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
