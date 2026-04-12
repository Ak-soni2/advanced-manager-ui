"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Sidebar from "@/components/Sidebar";
import { StatusBadge, PriorityBadge, ConfidenceBar } from "@/components/Badges";
import { useToast } from "@/components/Toast";
import { tasksApi, authApi } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/dashboard/manager", icon: "📊", label: "Overview" },
  { href: "/dashboard/manager/pending", icon: "⏳", label: "Pending Review" },
  { href: "/dashboard/manager/tasks", icon: "📋", label: "All Tasks" },
  { href: "/dashboard/manager/meetings", icon: "🎤", label: "Meetings" },
  { href: "/dashboard/manager/team", icon: "👥", label: "Team" },
];

interface ConfirmModalProps {
  task: any;
  developers: any[];
  onClose: () => void;
  onConfirm: (data: any) => void;
}

function ConfirmModal({ task, developers, onClose, onConfirm }: ConfirmModalProps) {
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState(task.priority || "medium");
  const [deadline, setDeadline] = useState(task.deadline || "");
  const [notes, setNotes] = useState("");
  const [selectedDevs, setSelectedDevs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function toggleDev(id: string) {
    setSelectedDevs(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedDevs.length === 0) return;
    setLoading(true);
    await onConfirm({
      assigned_to: selectedDevs[0],
      description,
      priority,
      deadline: deadline || null,
      manager_notes: notes || null,
      assignees_list: selectedDevs,
    });
    setLoading(false);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">✅ Confirm & Assign Task</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {/* AI Info */}
        <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius)", padding: 14, marginBottom: 20 }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>AI Suggested Assignee</p>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            {task.raw_assignee || "Unknown"} · Confidence:
          </p>
          <ConfidenceBar confidence={task.confidence || 0} />
          {task.reasoning && (
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, fontStyle: "italic" }}>
              💡 {task.reasoning}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Task Description</label>
            <textarea
              className="form-textarea"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              required
            />
          </div>

          <div className="two-col">
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="high">🔴 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Deadline</label>
              <input
                type="date"
                className="form-input"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Assign To (select one or more)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "10px 0" }}>
              {developers.map(dev => (
                <button
                  key={dev.id}
                  type="button"
                  onClick={() => toggleDev(dev.id)}
                  className={`btn btn-sm ${selectedDevs.includes(dev.id) ? "btn-primary" : "btn-secondary"}`}
                >
                  {selectedDevs.includes(dev.id) ? "✓ " : ""}
                  {dev.username}
                </button>
              ))}
            </div>
            {selectedDevs.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--accent-rose)" }}>Select at least one developer</p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Manager Notes (optional)</label>
            <textarea
              className="form-textarea"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add context or instructions for the developer..."
              rows={2}
            />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={loading || selectedDevs.length === 0}
            >
              {loading ? <span className="spinner" /> : "✅ Confirm & Assign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PendingTasksPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [developers, setDevelopers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmTask, setConfirmTask] = useState<any | null>(null);

  const navItems = NAV_ITEMS.map(item =>
    item.href === "/dashboard/manager/pending"
      ? { ...item, badge: tasks.length }
      : item
  );

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [t, d] = await Promise.all([
        tasksApi.pending(user),
        authApi.getDevelopers(user),
      ]);
      setTasks(t);
      setDevelopers(d);
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

  async function handleConfirm(taskId: string, data: any) {
    try {
      await tasksApi.confirm(user!, taskId, data);
      showToast("Task confirmed and assigned! 🎉", "success");
      setConfirmTask(null);
      load();
    } catch (e: any) {
      showToast(e.message, "error");
    }
  }

  async function handleReject(taskId: string) {
    if (!confirm("Reject this task?")) return;
    try {
      await tasksApi.reject(user!, taskId);
      showToast("Task rejected", "info");
      load();
    } catch (e: any) {
      showToast(e.message, "error");
    }
  }

  async function handleGitHubSync(task: any) {
    const dev = developers.find(d => d.id === task.assigned_to);
    try {
      const res = await tasksApi.githubSync(user!, task.id, dev?.github_handle);
      showToast(`GitHub issue created! 🐙`, "success");
      window.open(res.github_issue_url, "_blank");
    } catch (e: any) {
      showToast(e.message, "error");
    }
  }

  return (
    <div className="app-shell">
      <Sidebar navItems={navItems} />
      <main className="main-content">
        <ToastContainer />
        {confirmTask && (
          <ConfirmModal
            task={confirmTask}
            developers={developers}
            onClose={() => setConfirmTask(null)}
            onConfirm={(data) => handleConfirm(confirmTask.id, data)}
          />
        )}

        <div className="topbar">
          <div className="topbar-title">
            <h2>⏳ Pending Review</h2>
            <p>AI-extracted tasks awaiting your decision</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
        </div>

        <div className="page-container">
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
              <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
          ) : tasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎉</div>
              <h3>All clear!</h3>
              <p>No tasks pending review. Upload a meeting to extract new tasks.</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => router.push("/dashboard/manager/meetings")}>
                🎤 Upload Meeting
              </button>
            </div>
          ) : (
            <div className="tasks-grid">
              {tasks.map(task => (
                <div key={task.id} className={`task-card priority-${task.priority}`}>
                  <div className="task-header">
                    <p className="task-description">{task.description}</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                      <PriorityBadge priority={task.priority} />
                    </div>
                  </div>

                  <div style={{ margin: "10px 0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                      <span>AI Confidence</span>
                      <span>{task.confidence}%</span>
                    </div>
                    <ConfidenceBar confidence={task.confidence} />
                  </div>

                  <div className="task-meta">
                    {task.raw_assignee && (
                      <span className="task-meta-item">🤖 AI suggested: <strong>{task.raw_assignee}</strong></span>
                    )}
                    {task.deadline && <span className="task-meta-item">📅 {task.deadline}</span>}
                    {task.meeting_title && <span className="task-meta-item">🎤 {task.meeting_title}</span>}
                  </div>

                  {task.reasoning && (
                    <p style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic", margin: "8px 0", padding: "8px", background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)" }}>
                      💡 {task.reasoning}
                    </p>
                  )}

                  <div className="task-actions">
                    <button
                      id={`confirm-task-${task.id}`}
                      className="btn btn-success"
                      onClick={() => setConfirmTask(task)}
                    >
                      ✅ Confirm & Assign
                    </button>
                    <button
                      id={`reject-task-${task.id}`}
                      className="btn btn-danger"
                      onClick={() => handleReject(task.id)}
                    >
                      ❌ Reject
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
