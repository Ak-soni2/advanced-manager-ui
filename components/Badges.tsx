"use client";

interface BadgeProps {
  status?: string;
  priority?: string;
  className?: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending_review: "Pending Review",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  done: "Done",
  rejected: "Rejected",
};

const STATUS_ICONS: Record<string, string> = {
  pending_review: "⏳",
  confirmed: "✅",
  in_progress: "⚡",
  done: "🎉",
  rejected: "❌",
};

const PRIORITY_ICONS: Record<string, string> = {
  high: "🔴",
  medium: "🟡",
  low: "🟢",
};

export function StatusBadge({ status = "" }: BadgeProps) {
  const cls = status.replace("_", "_");
  return (
    <span className={`badge badge-${cls}`}>
      {STATUS_ICONS[status]} {STATUS_LABELS[status] || status}
    </span>
  );
}

export function PriorityBadge({ priority = "" }: BadgeProps) {
  return (
    <span className={`badge badge-${priority}`}>
      {PRIORITY_ICONS[priority]} {priority}
    </span>
  );
}

interface ConfidenceBarProps {
  confidence: number;
}

export function ConfidenceBar({ confidence }: ConfidenceBarProps) {
  const color =
    confidence >= 75
      ? "var(--status-done)"
      : confidence >= 50
      ? "var(--status-pending)"
      : "var(--accent-rose)";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div className="confidence-bar" style={{ flex: 1 }}>
        <div
          className="confidence-fill"
          style={{ width: `${confidence}%`, background: color }}
        />
      </div>
      <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 32 }}>
        {confidence}%
      </span>
    </div>
  );
}

interface StatCardProps {
  icon: string;
  value: number | string;
  label: string;
  color?: string;
}

export function StatCard({ icon, value, label, color }: StatCardProps) {
  return (
    <div className="stat-card" style={{ "--accent-gradient": color } as any}>
      <span className="stat-icon">{icon}</span>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
