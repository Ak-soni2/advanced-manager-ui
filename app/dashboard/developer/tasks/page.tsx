"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Sidebar from "@/components/Sidebar";
import { StatusBadge, PriorityBadge } from "@/components/Badges";
import { useToast } from "@/components/Toast";
import { tasksApi } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/dashboard/developer", icon: "🏠", label: "My Dashboard" },
  { href: "/dashboard/developer/tasks", icon: "📋", label: "My Tasks" },
];

const STATUS_FLOW: Record<string, { next: string; label: string; btn: string }> = {
  confirmed: { next: "in_progress", label: "Start Working", btn: "btn-primary" },
  in_progress: { next: "done", label: "Mark as Done", btn: "btn-success" },
  done: { next: "done", label: "Completed ✓", btn: "btn-ghost" },
};

interface ThreadModalProps {
  task: any;
  user: any;
  onClose: () => void;
}

function ThreadModal({ task, user, onClose }: ThreadModalProps) {
  const [thread, setThread] = useState<any[]>([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    tasksApi.getThread(user, task.id).then(r => {
      setThread(r.thread);
      setLoading(false);
    });
  }, [user, task.id]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setSending(true);
    await tasksApi.appendNote(user, task.id, note.trim(), "💻", "Dev");
    const r = await tasksApi.getThread(user, task.id);
    setThread(r.thread);
    setNote("");
    setSending(false);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">💬 Task Thread</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>Task</p>
          <p style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 500 }}>{task.description}</p>
        </div>

        {task.manager_notes && thread.length === 0 && !loading && (
          <div style={{
            background: "rgba(99, 102, 241, 0.08)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: 12,
            marginBottom: 12,
            fontSize: 13,
            color: "var(--text-secondary)"
          }}>
            📌 <strong>Manager notes:</strong> {task.manager_notes}
          </div>
        )}

        <div className="thread-container" style={{ marginBottom: 16 }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 20 }}>
              <div className="spinner" />
            </div>
          ) : thread.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13, padding: 20 }}>
              No messages yet. Add an update!
            </p>
          ) : (
            thread.map((msg, i) => (
              <div key={i} className="thread-message">
                <div className="thread-message-header">
                  <span>{msg.icon}</span>
                  <span className="thread-message-label">{msg.label}</span>
                </div>
                <p className="thread-message-text">{msg.text}</p>
              </div>
            ))
          )}
        </div>
        <form onSubmit={handleSend} style={{ display: "flex", gap: 8 }}>
          <input
            className="form-input"
            placeholder="Add an update or message..."
            value={note}
            onChange={e => setNote(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary" disabled={sending || !note.trim()}>
            {sending ? <span className="spinner" /> : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function DeveloperTasksPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "confirmed" | "in_progress" | "done">("all");
  const [threadTask, setThreadTask] = useState<any | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await tasksApi.developerTasks(user);
      setTasks(data);
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    load();
  }, [user, router, load]);

  async function handleStatusChange(task: any) {
    const flow = STATUS_FLOW[task.status];
    if (!flow || flow.next === task.status) return;
    setUpdatingId(task.id);
    try {
      await tasksApi.updateStatus(user!, task.id, flow.next);
      showToast(`Task moved to ${flow.next.replace("_", " ")} 🎉`, "success");
      load();
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = filter === "all" ? tasks : tasks.filter(t => t.status === filter);

  return (
    <div className="app-shell">
      <Sidebar navItems={NAV_ITEMS} />
      <main className="main-content">
        <ToastContainer />
        {threadTask && (
          <ThreadModal task={threadTask} user={user} onClose={() => { setThreadTask(null); load(); }} />
        )}

        <div className="topbar">
          <div className="topbar-title">
            <h2>📋 My Tasks</h2>
            <p>{filtered.length} tasks</p>
          </div>
          <div className="topbar-actions">
            <button className="btn btn-ghost btn-sm" onClick={load}>↻</button>
          </div>
        </div>

        <div className="page-container">
          {/* Filter Tabs */}
          <div className="tabs">
            {(["all", "confirmed", "in_progress", "done"] as const).map(f => (
              <button
                key={f}
                className={`tab ${filter === f ? "active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "📦 All" :
                 f === "confirmed" ? "📌 To Do" :
                 f === "in_progress" ? "⚡ In Progress" :
                 "🎉 Done"}
                <span style={{ marginLeft: 4, opacity: 0.6, fontSize: 11 }}>
                  ({tasks.filter(t => f === "all" ? true : t.status === f).length})
                </span>
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
              <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <h3>No tasks here</h3>
              <p>{filter === "all" ? "No tasks assigned yet" : `No ${filter.replace("_", " ")} tasks`}</p>
            </div>
          ) : (
            <div className="tasks-grid">
              {filtered.map(task => {
                const flow = STATUS_FLOW[task.status];
                const isUpdating = updatingId === task.id;

                return (
                  <div key={task.id} className={`task-card priority-${task.priority}`}>
                    <div className="task-header">
                      <p className="task-description">{task.description}</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                        <StatusBadge status={task.status} />
                        <PriorityBadge priority={task.priority} />
                      </div>
                    </div>

                    {task.manager_notes && (
                      <div style={{
                        background: "rgba(99, 102, 241, 0.06)",
                        borderRadius: "var(--radius-sm)",
                        padding: "8px 12px",
                        margin: "8px 0",
                        fontSize: 12,
                        color: "var(--text-muted)",
                        borderLeft: "2px solid var(--accent-primary)"
                      }}>
                        📌 {task.manager_notes.split("\n")[0]}
                      </div>
                    )}

                    <div className="task-meta">
                      {task.deadline && <span className="task-meta-item">📅 {task.deadline}</span>}
                      {task.meeting_title && <span className="task-meta-item" style={{ color: "var(--text-muted)" }}>🎤 {task.meeting_title}</span>}
                      {task.github_issue_url && (
                        <a href={task.github_issue_url} target="_blank" rel="noopener" className="task-meta-item" style={{ color: "var(--accent-primary)" }}>
                          🐙 GitHub
                        </a>
                      )}
                    </div>

                    <div className="task-actions">
                      {flow && flow.next !== task.status && (
                        <button
                          id={`advance-${task.id}`}
                          className={`btn ${flow.btn}`}
                          onClick={() => handleStatusChange(task)}
                          disabled={isUpdating}
                        >
                          {isUpdating ? <span className="spinner" /> : `▶ ${flow.label}`}
                        </button>
                      )}
                      {task.status === "done" && (
                        <span className="badge badge-done">🎉 Completed</span>
                      )}
                      <button
                        id={`thread-${task.id}`}
                        className="btn btn-ghost btn-sm"
                        onClick={() => setThreadTask(task)}
                      >
                        💬 Thread
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
