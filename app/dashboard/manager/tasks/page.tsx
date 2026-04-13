"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Sidebar from "@/components/Sidebar";
import { StatusBadge, PriorityBadge } from "@/components/Badges";
import { useToast } from "@/components/Toast";
import { tasksApi, authApi } from "@/lib/api";

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

function getThreadMessageCount(notes?: string | null) {
  if (!notes) return 0;
  return notes.split("\n").filter(line => /^\[.*\]:/.test(line.trim())).length;
}

interface ThreadModalProps {
  task: any;
  user: any;
  onClose: () => void;
  onSend: (text: string) => Promise<void>;
}

interface TaskDetailsModalProps {
  task: any;
  developers: any[];
  user: any;
  onClose: () => void;
  onUpdate: (taskId: string, updates: any) => Promise<void>;
  onGitHubSync: (task: any) => Promise<void>;
  githubSyncLocked: boolean;
  githubSyncing: boolean;
}

function TaskDetailsModal({ task, developers, user, onClose, onUpdate, onGitHubSync, githubSyncLocked, githubSyncing }: TaskDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState(task.priority);
  const [deadline, setDeadline] = useState(task.deadline || "");
  const [notes, setNotes] = useState(task.manager_notes || "");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      await onUpdate(task.id, {
        description,
        priority,
        deadline: deadline || null,
        manager_notes: notes || null,
      });
      setIsEditing(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">📋 Task Details</h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>ID: {task.id.slice(0, 8)}...</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <div style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: 4 }}>
          {/* Status & Priority */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
            <div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Status</p>
              <StatusBadge status={task.status} />
            </div>
            <div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Priority</p>
              {isEditing ? (
                <select className="form-select" value={priority} onChange={e => setPriority(e.target.value)} style={{ padding: "6px 10px", fontSize: 13 }}>
                  <option value="high">🔴 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🟢 Low</option>
                </select>
              ) : (
                <PriorityBadge priority={priority} />
              )}
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Description</p>
            {isEditing ? (
              <textarea className="form-textarea" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
            ) : (
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, padding: "10px", background: "var(--bg-elevated)", borderRadius: "var(--radius)" }}>
                {description}
              </p>
            )}
          </div>

          {/* Deadline */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Deadline</p>
            {isEditing ? (
              <input type="date" className="form-input" value={deadline} onChange={e => setDeadline(e.target.value)} />
            ) : (
              <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>{deadline || "Not set"}</p>
            )}
          </div>

          {/* Assignee */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Assigned To</p>
            <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
              {task.assigned_username ? `👤 ${task.assigned_username}` : "Not assigned"}
            </p>
          </div>

          {/* GitHub Link */}
          {task.github_issue_url && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>GitHub Issue</p>
              <a href={task.github_issue_url} target="_blank" rel="noopener" style={{ fontSize: 14, color: "var(--accent-primary)", wordBreak: "break-all" }}>
                {task.github_issue_url}
              </a>
            </div>
          )}

          {/* Manager Notes */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Manager Notes</p>
            {isEditing ? (
              <textarea className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Add notes..." />
            ) : (
              <p style={{ fontSize: 14, color: "var(--text-secondary)", padding: "10px", background: "var(--bg-elevated)", borderRadius: "var(--radius)", minHeight: 40, whiteSpace: "pre-wrap" }}>
                {notes || "No notes"}
              </p>
            )}
          </div>

          {/* Meeting Info */}
          <div style={{ marginBottom: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>From Meeting</p>
            <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>🎤 {task.meeting_title || "Unknown"}</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
          {!isEditing ? (
            <>
              <button className="btn btn-secondary" onClick={() => setIsEditing(true)}>✏️ Edit</button>
              {task.status === "confirmed" && (
                <button className="btn btn-secondary" onClick={() => onGitHubSync(task)} disabled={githubSyncing}>
                  {githubSyncing ? <span className="spinner" /> : githubSyncLocked ? "🐙 Synced" : "🐙 Push to GitHub"}
                </button>
              )}
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={onClose}>Close</button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => setIsEditing(false)} disabled={loading}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={loading}>
                {loading ? <span className="spinner" /> : "💾 Save"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ThreadModal({ task, user, onClose, onSend }: ThreadModalProps) {
  const [thread, setThread] = useState<any[]>([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [statusSuggestion, setStatusSuggestion] = useState<null | {
    current_status: string;
    suggested_status: string;
    changed: boolean;
    based_on_note: string;
  }>(null);
  const messageCount = thread.length;

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

  async function handleAiSuggestStatus() {
    setSuggesting(true);
    try {
      const suggestion = await tasksApi.aiSuggestStatus(user, task.id, note.trim() || undefined);
      setStatusSuggestion(suggestion);
    } finally {
      setSuggesting(false);
    }
  }

  async function applySuggestedStatus() {
    if (!statusSuggestion || !statusSuggestion.changed) return;
    await tasksApi.updateFull(user, task.id, { status: statusSuggestion.suggested_status });
    setStatusSuggestion({ ...statusSuggestion, current_status: statusSuggestion.suggested_status, changed: false });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 className="modal-title">💬 Task Thread</h2>
            {messageCount > 0 && <span className="badge badge-info">{messageCount}</span>}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>{task.description}</p>
        <div className="thread-container" style={{ marginBottom: 16, maxHeight: "40vh", overflowY: "auto" }}>
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
        {messageCount > 0 ? (
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button className="btn btn-secondary btn-sm" onClick={handleAiSuggestStatus} disabled={suggesting}>
              {suggesting ? "🤖 Thinking..." : "🤖 AI Suggest Status"}
            </button>
            {statusSuggestion?.changed && (
              <button className="btn btn-success btn-sm" onClick={applySuggestedStatus}>
                ✅ Apply: {statusSuggestion.suggested_status.replace("_", " ")}
              </button>
            )}
          </div>
        ) : (
          <p style={{ marginTop: 10, fontSize: 12, color: "var(--text-muted)" }}>
            Add a thread message first to enable AI status suggestions.
          </p>
        )}
        {statusSuggestion && messageCount > 0 && (
          <p style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
            AI Suggestion: <strong>{statusSuggestion.suggested_status.replace("_", " ")}</strong>
          </p>
        )}
      </div>
    </div>
  );
}

export default function AllTasksPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [developers, setDevelopers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [meetingFilter, setMeetingFilter] = useState("");
  const [search, setSearch] = useState("");
  const [threadTask, setThreadTask] = useState<any | null>(null);
  const [detailedTask, setDetailedTask] = useState<any | null>(null);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [githubSyncingTaskId, setGithubSyncingTaskId] = useState<string | null>(null);
  const [syncedGithubTaskIds, setSyncedGithubTaskIds] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [data, devs] = await Promise.all([
        tasksApi.managerAll(user, statusFilter || undefined),
        authApi.getDevelopers(user),
      ]);
      setTasks(data);
      setDevelopers(devs);
      // Get unique meetings
      const uniqueMeetings = Array.from(new Map(
        data.map(t => [t.meeting_id, { id: t.meeting_id, title: t.meeting_title }])
      ).values());
      setMeetings(uniqueMeetings);
      if (!meetingFilter && uniqueMeetings.length > 0) {
        setMeetingFilter(String(uniqueMeetings[0].id));
      }
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [user, statusFilter, meetingFilter]);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    load();
  }, [user, router, load]);

  async function handleUpdateTask(taskId: string, updates: any) {
    try {
      await tasksApi.updateFull(user!, taskId, updates);
      showToast("Task updated!", "success");
      setDetailedTask(null);
      load();
    } catch (e: any) {
      showToast(e.message, "error");
    }
  }

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
    if (githubSyncingTaskId === task.id || task.github_issue_url || syncedGithubTaskIds[task.id]) return;
    setGithubSyncingTaskId(task.id);
    try {
      const res = await tasksApi.githubSync(user!, task.id);
      showToast("GitHub issue created! 🐙", "success");
      window.open(res.github_issue_url, "_blank");
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, github_issue_url: res.github_issue_url } : t));
      setSyncedGithubTaskIds(prev => ({ ...prev, [task.id]: true }));
      load();
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setGithubSyncingTaskId(null);
    }
  }

  async function handleGitHubSyncAll() {
    if (githubSyncingTaskId) return;
    setGithubSyncingTaskId("__all__");
    try {
      const res = await tasksApi.githubSyncAll(user!);
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
      setGithubSyncingTaskId(null);
    }
  }

  async function sendNote(taskId: string, text: string) {
    await tasksApi.appendNote(user!, taskId, text, "💼", "Mngr");
    // Reload to show latest thread
    const updated = tasks.find(t => t.id === taskId);
    if (detailedTask?.id === taskId) {
      setDetailedTask(updated);
    }
  }

  const filtered = tasks.filter(t => {
    const matchesMeeting = !meetingFilter || t.meeting_id === meetingFilter;
    const matchesSearch = search === "" || 
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.assigned_username?.toLowerCase().includes(search.toLowerCase());
    return matchesMeeting && matchesSearch;
  });
  const pendingGithubCount = tasks.filter(t => !t.github_issue_url && t.status !== "rejected" && t.status !== "pending_review" && !syncedGithubTaskIds[t.id]).length;

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
        {detailedTask && (
          <TaskDetailsModal
            task={detailedTask}
            developers={developers}
            user={user}
            onClose={() => setDetailedTask(null)}
            onUpdate={handleUpdateTask}
            onGitHubSync={handleGitHubSync}
            githubSyncLocked={!!detailedTask.github_issue_url || !!syncedGithubTaskIds[detailedTask.id]}
            githubSyncing={githubSyncingTaskId === detailedTask.id}
          />
        )}

        <div className="topbar">
          <div className="topbar-title">
            <h2>📋 All Tasks</h2>
            <p>{filtered.length} of {tasks.length} tasks</p>
          </div>
          <div className="topbar-actions">
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleGitHubSyncAll}
              disabled={loading || githubSyncingTaskId === "__all__" || pendingGithubCount === 0}
            >
              {loading || githubSyncingTaskId === "__all__" ? <span className="spinner" /> : pendingGithubCount === 0 ? "🐙 GitHub Synced" : "🐙 Sync All GitHub"}
            </button>
            <input
              className="form-input"
              placeholder="🔍 Search tasks..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 200 }}
            />
            {meetings.length > 0 && (
              <select
                className="form-select"
                value={meetingFilter}
                onChange={e => setMeetingFilter(e.target.value)}
                style={{ width: 180 }}
              >
                <option value="">All Meetings</option>
                {meetings.map(m => (
                  <option key={m.id} value={m.id}>{m.title || 'Untitled'}</option>
                ))}
              </select>
            )}
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
                    <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setDetailedTask(task)}>
                      <p className="task-description" style={{ color: "var(--accent-primary)", textDecoration: "underline" }}>{task.description}</p>
                      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, background: "var(--bg-elevated)", padding: "3px 8px", borderRadius: "var(--radius-sm)", color: "var(--text-muted)" }}>
                          🎤 {task.meeting_title || 'Meeting'}
                        </span>
                        {task.deadline && (
                          <span style={{ fontSize: 11, background: "var(--bg-elevated)", padding: "3px 8px", borderRadius: "var(--radius-sm)", color: "var(--text-muted)" }}>
                            📅 {task.deadline}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0, alignItems: "flex-end" }}>
                      <StatusBadge status={task.status} />
                      <PriorityBadge priority={task.priority} />
                    </div>
                  </div>
                  <div className="task-meta">
                    {task.assigned_username && <span className="task-meta-item">👤 {task.assigned_username}</span>}
                    {task.github_issue_url && (
                      <a href={task.github_issue_url} target="_blank" rel="noopener" className="task-meta-item" style={{ color: "var(--accent-primary)" }}>
                        🐙 GitHub Issue
                      </a>
                    )}
                  </div>
                  <div className="task-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => setDetailedTask(task)}>
                      👁️ Details
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setThreadTask(task)}>
                      💬 Thread{getThreadMessageCount(task.manager_notes) > 0 ? ` (${getThreadMessageCount(task.manager_notes)})` : ""}
                    </button>
                    {task.status !== "rejected" && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleGitHubSync(task)}
                        disabled={!!task.github_issue_url || !!syncedGithubTaskIds[task.id] || githubSyncingTaskId === task.id}
                      >
                        {githubSyncingTaskId === task.id
                          ? <span className="spinner" />
                          : (task.github_issue_url || syncedGithubTaskIds[task.id]) ? "🐙 Synced" : "🐙 GitHub"}
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
