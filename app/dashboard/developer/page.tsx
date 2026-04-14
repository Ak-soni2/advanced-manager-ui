"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Sidebar from "@/components/Sidebar";
import { StatusBadge, PriorityBadge, StatCard } from "@/components/Badges";
import { useToast } from "@/components/Toast";
import { tasksApi, statsApi, type LeaderboardRow } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/dashboard/developer", icon: "🏠", label: "My Dashboard" },
  { href: "/dashboard/developer/tasks", icon: "📋", label: "My Tasks" },
];

export default function DeveloperDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [tasks, setTasks] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [githubSyncing, setGithubSyncing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [s, t, lb] = await Promise.all([
        statsApi.developer(user),
        tasksApi.developerTasks(user),
        statsApi.leaderboard(user),
      ]);
      setStats(s);
      setTasks(t);
      setLeaderboard(lb);
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  async function handleSyncMyGithub() {
    if (!user) return;
    if (githubSyncing) return;
    setGithubSyncing(true);
    try {
      const res = await tasksApi.developerGithubSyncAll(user);
      const failureSummary = res.failed_details?.slice(0, 3).map(item => `${item.description}: ${item.error}`).join(" | ");
      showToast(
        res.failed > 0
          ? `GitHub sync complete: created ${res.created}, failed ${res.failed}${failureSummary ? ` • ${failureSummary}` : ""}`
          : `GitHub sync complete: created ${res.created}, failed ${res.failed}`,
        res.failed > 0 ? "error" : "success"
      );
      load();
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setGithubSyncing(false);
    }
  }

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (user.role === "manager") { router.push("/dashboard/manager"); return; }
    load();
  }, [user, router, load]);

  const urgentTasks = tasks.filter(t => t.priority === "high" && t.status !== "done");
  const pendingGithubCount = tasks.filter(t => !t.github_issue_url && t.status !== "rejected" && t.status !== "pending_review").length;

  return (
    <div className="app-shell">
      <Sidebar navItems={NAV_ITEMS} />
      <main className="main-content">
        <ToastContainer />
        <div className="topbar">
          <div className="topbar-title">
            <h2>🏠 My Dashboard</h2>
            <p>Welcome back, {user?.username}!</p>
          </div>
          <div className="topbar-actions">
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleSyncMyGithub}
              disabled={loading || githubSyncing || pendingGithubCount === 0}
            >
              {loading || githubSyncing ? <span className="spinner" /> : pendingGithubCount === 0 ? "🐙 GitHub Synced" : "🐙 Sync My GitHub"}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
          </div>
        </div>

        <div className="page-container">
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
              <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
          ) : (
            <>
              <div className="stats-grid">
                <StatCard icon="📦" value={stats.total || 0} label="Total Tasks" color="linear-gradient(90deg, #6366f1, #8b5cf6)" />
                <StatCard icon="📌" value={stats.todo || 0} label="To Do" color="linear-gradient(90deg, #818cf8, #6366f1)" />
                <StatCard icon="⚡" value={stats.in_progress || 0} label="In Progress" color="linear-gradient(90deg, #22d3ee, #06b6d4)" />
                <StatCard icon="🎉" value={stats.done || 0} label="Done" color="linear-gradient(90deg, #10b981, #059669)" />
                <StatCard icon="🔴" value={stats.high || 0} label="High Priority" color="linear-gradient(90deg, #f43f5e, #e11d48)" />
              </div>

              {urgentTasks.length > 0 && (
                <div style={{
                  background: "rgba(244, 63, 94, 0.08)",
                  border: "1px solid rgba(244, 63, 94, 0.25)",
                  borderRadius: "var(--radius-lg)",
                  padding: "16px 20px",
                  marginBottom: 24,
                  display: "flex",
                  alignItems: "center",
                  gap: 12
                }}>
                  <span style={{ fontSize: 24 }}>🚨</span>
                  <div>
                    <p style={{ fontWeight: 700, color: "var(--accent-rose)", fontSize: 14 }}>
                      {urgentTasks.length} urgent task{urgentTasks.length > 1 ? "s" : ""} need your attention!
                    </p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)" }}>High priority items that require immediate action</p>
                  </div>
                  <button className="btn btn-danger btn-sm" style={{ marginLeft: "auto" }} onClick={() => router.push("/dashboard/developer/tasks")}>
                    View →
                  </button>
                </div>
              )}

              <div className="card">
                <div className="section-header">
                  <h3 className="section-title">🕐 Recent Tasks</h3>
                  <button className="btn btn-ghost btn-sm" onClick={() => router.push("/dashboard/developer/tasks")}>
                    View All →
                  </button>
                </div>
                {tasks.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📭</div>
                    <h3>No tasks assigned yet</h3>
                    <p>Your manager will assign tasks after reviewing meeting transcripts</p>
                  </div>
                ) : (
                  <div className="tasks-grid">
                    {tasks.slice(0, 5).map(task => (
                      <div key={task.id} className={`task-card priority-${task.priority}`}>
                        <div className="task-header">
                          <p className="task-description">{task.description}</p>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                            <StatusBadge status={task.status} />
                          </div>
                        </div>
                        <div className="task-meta">
                          <PriorityBadge priority={task.priority} />
                          {task.deadline && <span className="task-meta-item">📅 {task.deadline}</span>}
                          {task.meeting_title && <span className="task-meta-item" style={{ color: "var(--text-muted)" }}>🎤 {task.meeting_title}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Developer Leaderboard */}
              <div className="card" style={{ marginTop: 24 }}>
                <div className="section-header">
                  <h3 className="section-title">🏆 Developer Leaderboard</h3>
                </div>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
                  Team-wide performance ranking using completion rate, GitHub linkage, and AI confidence.
                </p>

                {leaderboard.length === 0 ? (
                  <div className="empty-state" style={{ padding: 28 }}>
                    <div className="empty-state-icon">📊</div>
                    <h3>No leaderboard data yet</h3>
                    <p>Assign and complete tasks to populate the leaderboard</p>
                  </div>
                ) : (
                  <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860, fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "var(--bg-elevated)", textAlign: "left" }}>
                          <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>Rank</th>
                          <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>Developer</th>
                          <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>Total Tasks</th>
                          <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>Completed</th>
                          <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>Completion %</th>
                          <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>GH Linked</th>
                          <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>Avg Confidence</th>
                          <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>Overall Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.map((row, index) => {
                          const isCurrentUser = row.developer_id === user?.id;
                          return (
                            <tr
                              key={row.developer_id}
                              style={{
                                borderBottom: "1px solid var(--border)",
                                background: isCurrentUser ? "rgba(243, 154, 15, 0.12)" : "transparent",
                              }}
                            >
                              <td style={{ padding: "10px 12px", fontWeight: 700 }}>#{index + 1}</td>
                              <td style={{ padding: "10px 12px", fontWeight: isCurrentUser ? 700 : 500 }}>
                                {row.developer}{isCurrentUser ? " (You)" : ""}
                              </td>
                              <td style={{ padding: "10px 12px" }}>{row.total}</td>
                              <td style={{ padding: "10px 12px" }}>{row.completed}</td>
                              <td style={{ padding: "10px 12px" }}>{row.completion_rate.toFixed(1)}%</td>
                              <td style={{ padding: "10px 12px" }}>{row.github_linked}</td>
                              <td style={{ padding: "10px 12px" }}>{row.avg_confidence.toFixed(1)}</td>
                              <td style={{ padding: "10px 12px", fontWeight: 700, color: "var(--text-accent)" }}>
                                {row.overall_score.toFixed(1)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <p style={{ marginTop: 10, fontSize: 12, color: "var(--text-muted)" }}>
                  Score = (Completion Rate * 0.5) + (GitHub Linked * 5) + (Avg Task Confidence * 0.2)
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
