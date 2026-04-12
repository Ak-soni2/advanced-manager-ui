"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Sidebar from "@/components/Sidebar";
import { StatusBadge, PriorityBadge } from "@/components/Badges";
import { useToast } from "@/components/Toast";
import { tasksApi } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/dashboard/manager", icon: "📊", label: "Overview" },
  { href: "/dashboard/manager/pending", icon: "⏳", label: "Pending Review" },
  { href: "/dashboard/manager/tasks", icon: "📋", label: "All Tasks" },
  { href: "/dashboard/manager/meetings", icon: "🎤", label: "Meetings" },
  { href: "/dashboard/manager/team", icon: "👥", label: "Team" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "pending_review", label: "Pending Review" },
  { value: "confirmed", label: "Confirmed" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "rejected", label: "Rejected" },
];

interface ThreadModalProps {
  task: any;
  user: any;
  onClose: () => void;
  onSend: (text: string) => Promise<void>;
}

function ThreadModal({ task, user, onClose, onSend }: ThreadModalProps) {
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
    await onSend(note.trim());
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
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>{task.description}</p>
        <div className="thread-container" style={{ marginBottom: 16 }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 20 }}>
              <div className="spinner" />
            </div>
          ) : thread.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13, padding: 20 }}>
              No messages yet. Start the conversation!
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
            placeholder="Type a message..."
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

export default function AllTasksPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [threadTask, setThreadTask] = useState<any | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await tasksApi.managerAll(user, statusFilter || undefined);
      setTasks(data);
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [user, statusFilter]);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    load();
  }, [user, router, load]);

  async function handleDelete(taskId: string) {
    if (!confirm("Delete this task?")) return;
    try {
      await tasksApi.delete(user!, taskId);
      showToast("Task deleted", "info");
      load();
    } catch (e: any) {
      showToast(e.message, "error");
    }
  }

  async function handleGitHubSync(task: any) {
    try {
      const res = await tasksApi.githubSync(user!, task.id);
      showToast("GitHub issue created! 🐙", "success");
      window.open(res.github_issue_url, "_blank");
    } catch (e: any) {
      showToast(e.message, "error");
    }
  }

  async function sendNote(taskId: string, text: string) {
    await tasksApi.appendNote(user!, taskId, text, "💼", "Mngr");
  }

  const filtered = tasks.filter(t =>
    t.description?.toLowerCase().includes(search.toLowerCase()) ||
    t.assigned_username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="app-shell">
      <Sidebar navItems={NAV_ITEMS} />
      <main className="main-content">
        <ToastContainer />
        {threadTask && (
          <ThreadModal
            task={threadTask}
            user={user}
            onClose={() => setThreadTask(null)}
            onSend={(text) => sendNote(threadTask.id, text)}
          />
        )}

        <div className="topbar">
          <div className="topbar-title">
            <h2>📋 All Tasks</h2>
            <p>{filtered.length} tasks</p>
          </div>
          <div className="topbar-actions">
            <input
              className="form-input"
              placeholder="🔍 Search tasks..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 220 }}
            />
            <select
              className="form-select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ width: 180 }}
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button className="btn btn-ghost btn-sm" onClick={load}>↻</button>
          </div>
        </div>

        <div className="page-container">
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
              <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <h3>No tasks found</h3>
              <p>Try adjusting your filters</p>
            </div>
          ) : (
            <div className="tasks-grid">
              {filtered.map(task => (
                <div key={task.id} className={`task-card priority-${task.priority}`}>
                  <div className="task-header">
                    <p className="task-description">{task.description}</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                      <StatusBadge status={task.status} />
                      <PriorityBadge priority={task.priority} />
                    </div>
                  </div>
                  <div className="task-meta">
                    {task.assigned_username && <span className="task-meta-item">👤 {task.assigned_username}</span>}
                    {task.deadline && <span className="task-meta-item">📅 {task.deadline}</span>}
                    {task.meeting_title && <span className="task-meta-item" style={{ color: "var(--text-muted)" }}>🎤 {task.meeting_title}</span>}
                    {task.github_issue_url && (
                      <a href={task.github_issue_url} target="_blank" rel="noopener" className="task-meta-item" style={{ color: "var(--accent-primary)" }}>
                        🐙 GitHub Issue
                      </a>
                    )}
                  </div>
                  <div className="task-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => setThreadTask(task)}>
                      💬 Thread
                    </button>
                    {task.status === "confirmed" && !task.github_issue_url && (
                      <button className="btn btn-secondary btn-sm" onClick={() => handleGitHubSync(task)}>
                        🐙 Sync to GitHub
                      </button>
                    )}
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(task.id)}>
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
