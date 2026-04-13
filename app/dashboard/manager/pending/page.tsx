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
  onAddDeveloper: (suggestedName?: string) => void;
}

interface AddDevModalProps {
  initialUsername?: string;
  onClose: () => void;
  onAdd: (username: string, github?: string) => Promise<void>;
}

function AddDevModal({ initialUsername, onClose, onAdd }: AddDevModalProps) {
  const [username, setUsername] = useState(initialUsername || "");
  const [github, setGithub] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setUsername(initialUsername || "");
  }, [initialUsername]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    await onAdd(username, github || undefined);
    setLoading(false);
  }

  return (
    <div className="modal-overlay modal-overlay-top" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">➕ Create Developer</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Developer Username</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., john_dev"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">GitHub Handle (optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., johndoe"
              value={github}
              onChange={e => setGithub(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading || !username.trim()}>
              {loading ? <span className="spinner" /> : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmModal({ task, developers, onClose, onConfirm, onAddDeveloper }: ConfirmModalProps) {
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState(task.priority || "medium");
  const [deadline, setDeadline] = useState(task.deadline || "");
  const [notes, setNotes] = useState("");
  const [selectedDevs, setSelectedDevs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestedMissingName, setSuggestedMissingName] = useState<string | null>(null);

  function normalizeName(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function splitSuggestedNames(raw: string): string[] {
    return raw
      .split(/,|&| and |\//gi)
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => s.replace(/^@+/, ""));
  }

  function findMatchingDeveloperId(suggestedName: string): string | null {
    const normalizedSuggested = normalizeName(suggestedName);
    for (const dev of developers) {
      const usernameNorm = normalizeName(dev.username || "");
      const githubNorm = normalizeName(dev.github_handle || "");
      if (!usernameNorm && !githubNorm) continue;
      if (
        usernameNorm === normalizedSuggested ||
        githubNorm === normalizedSuggested ||
        usernameNorm.includes(normalizedSuggested) ||
        normalizedSuggested.includes(usernameNorm) ||
        (githubNorm && (githubNorm.includes(normalizedSuggested) || normalizedSuggested.includes(githubNorm)))
      ) {
        return dev.id;
      }
    }
    return null;
  }

  // Auto-select AI suggested developer if available
  useEffect(() => {
    if (!task.raw_assignee || developers.length === 0) return;

    const suggestedNames = splitSuggestedNames(task.raw_assignee);
    const matchedIds: string[] = [];
    const unmatchedNames: string[] = [];

    for (const suggestedName of suggestedNames) {
      const matchedId = findMatchingDeveloperId(suggestedName);
      if (matchedId) {
        matchedIds.push(matchedId);
      } else {
        unmatchedNames.push(suggestedName);
      }
    }

    if (matchedIds.length > 0) {
      setSelectedDevs(Array.from(new Set(matchedIds)));
    }

    setSuggestedMissingName(unmatchedNames.length > 0 ? unmatchedNames[0] : null);
  }, [task.raw_assignee, developers]);

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
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>
            {task.raw_assignee || "Unknown"} · Confidence: <strong>{task.confidence}%</strong>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <label className="form-label" style={{ margin: 0 }}>Assign To (select one or more)</label>
              <button 
                type="button" 
                className="btn btn-xs btn-secondary"
                onClick={() => onAddDeveloper(suggestedMissingName || undefined)}
                style={{ padding: "4px 10px", fontSize: 12 }}
              >
                ➕ New Dev
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "10px 0", maxHeight: 180, overflowY: "auto", alignContent: "flex-start" }}>
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
            {selectedDevs.length === 0 && developers.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--accent-rose)" }}>No developers available. Create one first!</p>
            )}
            {selectedDevs.length === 0 && developers.length > 0 && (
              <p style={{ fontSize: 12, color: "var(--accent-rose)" }}>Select at least one developer</p>
            )}
            {suggestedMissingName && (
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-xs btn-secondary"
                  onClick={() => onAddDeveloper(suggestedMissingName)}
                >
                  👤 Create profile for AI suggestion: {suggestedMissingName}
                </button>
              </div>
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
  const [addDevModal, setAddDevModal] = useState(false);
  const [addDevSuggestedName, setAddDevSuggestedName] = useState("");
  const [meetingFilter, setMeetingFilter] = useState("");
  const [meetings, setMeetings] = useState<any[]>([]);

  const navItems = NAV_ITEMS.map(item =>
    item.href === "/dashboard/manager/pending"
      ? { ...item, badge: tasks.length }
      : item
  );

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [t, d, m] = await Promise.all([
        tasksApi.pending(user),
        authApi.getDevelopers(user),
        tasksApi.managerAll(user),
      ]);
      setTasks(t);
      setDevelopers(d);
      // Get unique meetings from tasks
      const uniqueMeetings = Array.from(new Map(
        t.map(task => [task.meeting_id, { id: task.meeting_id, title: task.meeting_title }])
      ).values());
      setMeetings(uniqueMeetings);
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

  async function handleAddDeveloper(username: string, github?: string) {
    try {
      await authApi.createDeveloper(user!, { username, github_handle: github });
      showToast(`Developer ${username} created! 🎉`, "success");
      setAddDevModal(false);
      load();
    } catch (e: any) {
      showToast(e.message, "error");
    }
  }

  const filteredTasks = meetingFilter 
    ? tasks.filter(t => t.meeting_id === meetingFilter)
    : tasks;

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
            onAddDeveloper={(suggestedName?: string) => {
              setAddDevSuggestedName(suggestedName || "");
              setAddDevModal(true);
            }}
          />
        )}
        {addDevModal && (
          <AddDevModal
            initialUsername={addDevSuggestedName}
            onClose={() => {
              setAddDevModal(false);
              setAddDevSuggestedName("");
            }}
            onAdd={handleAddDeveloper}
          />
        )}

        <div className="topbar">
          <div className="topbar-title">
            <h2>⏳ Pending Review</h2>
            <p>AI-extracted tasks awaiting your decision ({filteredTasks.length})</p>
          </div>
          <div className="topbar-actions">
            {meetings.length > 0 && (
              <select
                className="form-select"
                value={meetingFilter}
                onChange={e => setMeetingFilter(e.target.value)}
                style={{ width: 200 }}
              >
                <option value="">All Meetings</option>
                {meetings.map(m => (
                  <option key={m.id} value={m.id}>{m.title || 'Untitled'}</option>
                ))}
              </select>
            )}
            <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
          </div>
        </div>

        <div className="page-container">
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
              <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎉</div>
              <h3>All clear!</h3>
              <p>{meetingFilter ? "No tasks for this meeting." : "No tasks pending review. Upload a meeting to extract new tasks."}</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => router.push("/dashboard/manager/meetings")}>
                🎤 Upload Meeting
              </button>
            </div>
          ) : (
            <div className="tasks-grid">
              {filteredTasks.map(task => (
                <div key={task.id} className={`task-card priority-${task.priority}`}>
                  <div className="task-header">
                    <div style={{ flex: 1 }}>
                      <p className="task-description">{task.description}</p>
                      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, background: "var(--bg-elevated)", padding: "4px 8px", borderRadius: "var(--radius-sm)", color: "var(--text-muted)" }}>
                          🎤 {task.meeting_title || 'Meeting'}
                        </span>
                        {task.deadline && (
                          <span style={{ fontSize: 11, background: "var(--bg-elevated)", padding: "4px 8px", borderRadius: "var(--radius-sm)", color: "var(--text-muted)" }}>
                            📅 {task.deadline}
                          </span>
                        )}
                      </div>
                    </div>
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
                      <span className="task-meta-item">🤖 AI suggests: <strong>{task.raw_assignee}</strong></span>
                    )}
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
