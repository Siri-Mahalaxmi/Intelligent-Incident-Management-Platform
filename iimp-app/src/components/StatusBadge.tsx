import { Status } from "@/types/incident";

const statusConfig: Record<Status, { label: string; className: string }> = {
  OPEN: {
    label: "Open",
    className: "bg-blue-100 text-blue-800 border border-blue-200",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "bg-purple-100 text-purple-800 border border-purple-200",
  },
  RESOLVED: {
    label: "Resolved",
    className: "bg-gray-100 text-gray-600 border border-gray-200",
  },
};

interface StatusBadgeProps {
  status: Status;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}
