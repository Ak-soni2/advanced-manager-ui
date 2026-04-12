"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Sidebar from "@/components/Sidebar";
import { StatusBadge, PriorityBadge, ConfidenceBar, StatCard } from "@/components/Badges";
import { useToast } from "@/components/Toast";
import { tasksApi, statsApi, meetingsApi, authApi } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/dashboard/manager", icon: "📊", label: "Overview" },
  { href: "/dashboard/manager/pending", icon: "⏳", label: "Pending Review" },
  { href: "/dashboard/manager/tasks", icon: "📋", label: "All Tasks" },
  { href: "/dashboard/manager/meetings", icon: "🎤", label: "Meetings" },
  { href: "/dashboard/manager/team", icon: "👥", label: "Team" },
];

export default function ManagerOverview() {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [s, tasks] = await Promise.all([
        statsApi.manager(user),
        tasksApi.managerAll(user),
      ]);
      setStats(s);
      setPendingCount(s.pending_review || 0);
      setRecentTasks(tasks.slice(0, 5));
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (user.role !== "manager") { router.push("/dashboard/developer"); return; }
    load();
  }, [user, router, load]);

  const navItems = NAV_ITEMS.map(item =>
    item.href === "/dashboard/manager/pending"
      ? { ...item, badge: pendingCount }
      : item
  );

  return (
    <div className="app-shell">
      <Sidebar navItems={navItems} />
      <main className="main-content">
        <ToastContainer />
        <div className="topbar">
          <div className="topbar-title">
            <h2>📊 Manager Overview</h2>
            <p>Real-time task management dashboard</p>
          </div>
          <div className="topbar-actions">
            <button
              id="goto-pending-btn"
              className="btn btn-primary"
              onClick={() => router.push("/dashboard/manager/pending")}
            >
              ⏳ Review Pending ({pendingCount})
            </button>
          </div>
        </div>

        <div className="page-container">
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
              <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="stats-grid">
                <StatCard icon="📦" value={stats.total || 0} label="Total Tasks"
                  color="linear-gradient(90deg, #6366f1, #8b5cf6)" />
                <StatCard icon="⏳" value={stats.pending_review || 0} label="Pending Review"
                  color="linear-gradient(90deg, #f59e0b, #ef4444)" />
                <StatCard icon="⚡" value={stats.in_progress || 0} label="In Progress"
                  color="linear-gradient(90deg, #22d3ee, #06b6d4)" />
                <StatCard icon="🎉" value={stats.done || 0} label="Completed"
                  color="linear-gradient(90deg, #10b981, #059669)" />
                <StatCard icon="🔴" value={stats.high || 0} label="High Priority"
                  color="linear-gradient(90deg, #f43f5e, #e11d48)" />
              </div>

              {/* Priority Breakdown */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
                <div className="card">
                  <h3 className="section-title" style={{ marginBottom: 20 }}>📈 Status Breakdown</h3>
                  {[
                    { label: "Pending Review", key: "pending_review", color: "var(--status-pending)" },
                    { label: "Confirmed", key: "confirmed", color: "#818cf8" },
                    { label: "In Progress", key: "in_progress", color: "var(--status-progress)" },
                    { label: "Done", key: "done", color: "var(--status-done)" },
                    { label: "Rejected", key: "rejected", color: "var(--accent-rose)" },
                  ].map(({ label, key, color }) => {
                    const val = stats[key] || 0;
                    const pct = stats.total ? Math.round((val / stats.total) * 100) : 0;
                    return (
                      <div key={key} style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                          <span style={{ color: "var(--text-secondary)" }}>{label}</span>
                          <span style={{ color: "var(--text-muted)" }}>{val} ({pct}%)</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="card">
                  <h3 className="section-title" style={{ marginBottom: 20 }}>🎯 Priority Distribution</h3>
                  {[
                    { label: "High Priority", key: "high", color: "var(--priority-high)", icon: "🔴" },
                    { label: "Medium Priority", key: "medium", color: "var(--priority-medium)", icon: "🟡" },
                    { label: "Low Priority", key: "low", color: "var(--priority-low)", icon: "🟢" },
                  ].map(({ label, key, color, icon }) => {
                    const val = stats[key] || 0;
                    const pct = stats.total ? Math.round((val / stats.total) * 100) : 0;
                    return (
                      <div key={key} style={{ marginBottom: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{icon} {label}</span>
                          <span style={{ fontSize: 22, fontWeight: 800, color }}>{val}</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Tasks */}
              <div className="card">
                <div className="section-header">
                  <h3 className="section-title">🕐 Recent Tasks</h3>
                  <button className="btn btn-ghost btn-sm" onClick={() => router.push("/dashboard/manager/tasks")}>
                    View All →
                  </button>
                </div>
                {recentTasks.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📭</div>
                    <h3>No tasks yet</h3>
                    <p>Upload a meeting transcript to get started</p>
                  </div>
                ) : (
                  <div className="tasks-grid">
                    {recentTasks.map(task => (
                      <div key={task.id} className={`task-card priority-${task.priority}`}>
                        <div className="task-header">
                          <p className="task-description">{task.description}</p>
                          <StatusBadge status={task.status} />
                        </div>
                        <div className="task-meta">
                          <PriorityBadge priority={task.priority} />
                          {task.assigned_username && (
                            <span className="task-meta-item">👤 {task.assigned_username}</span>
                          )}
                          {task.deadline && (
                            <span className="task-meta-item">📅 {task.deadline}</span>
                          )}
                          {task.meeting_title && (
                            <span className="task-meta-item" style={{ color: "var(--text-muted)" }}>
                              🎤 {task.meeting_title}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
