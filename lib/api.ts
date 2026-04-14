// lib/api.ts - Centralized API client for the Automated Task Manager backend

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface User {
  id: string;
  username: string;
  role: "manager" | "developer";
  github_handle?: string;
}

interface LeaderboardRow {
  developer: string;
  developer_id: string;
  total: number;
  completed: number;
  completion_rate: number;
  github_linked: number;
  avg_confidence: number;
  overall_score: number;
}

function getHeaders(user?: User | null): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (user) {
    headers["X-User-Id"] = user.id;
    headers["X-User-Role"] = user.role;
  }
  return headers;
}

async function request<T>(
  path: string,
  options: RequestInit & { user?: User | null } = {}
): Promise<T> {
  const { user, ...fetchOpts } = options;
  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchOpts,
    headers: {
      ...getHeaders(user),
      ...(fetchOpts.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "API Error");
  }
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  login: (username: string, password: string) =>
    request<User>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  signup: (username: string, password: string, github_handle: string) =>
    request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ username, password, github_handle }),
    }),

  getDevelopers: (user: User) =>
    request<Array<{ id: string; username: string; github_handle: string }>>(
      "/api/auth/developers",
      { user }
    ),

  createDeveloper: (
    user: User,
    data: { username: string; github_handle?: string }
  ) =>
    request("/api/auth/create-developer", {
      method: "POST",
      user,
      body: JSON.stringify(data),
    }),
};

// ── Stats ─────────────────────────────────────────────────────────────────
export const statsApi = {
  manager: (user: User) => request<Record<string, number>>("/api/stats/manager", { user }),
  developer: (user: User) =>
    request<Record<string, number>>(`/api/stats/developer/${user.id}`, { user }),
  leaderboard: (user: User) => request<LeaderboardRow[]>("/api/leaderboard", { user }),
};

// ── Meetings ──────────────────────────────────────────────────────────────
export const meetingsApi = {
  list: (user: User) => request<any[]>("/api/meetings", { user }),
  upload: (
    user: User,
    data: { title: string; transcript: string; uploaded_by: string; attendees: string[] }
  ) =>
    request<{ success: boolean; meeting_id: string }>("/api/meetings/upload", {
      method: "POST",
      user,
      body: JSON.stringify(data),
    }),
  extract: (user: User, meeting_id: string, transcript: string) =>
    request<{ tasks_extracted: number; attendees: string[]; tasks: any[] }>(
      "/api/meetings/extract",
      {
        method: "POST",
        user,
        body: JSON.stringify({ meeting_id, transcript }),
      }
    ),
};

// ── Tasks ─────────────────────────────────────────────────────────────────
export const tasksApi = {
  pending: (user: User) => request<any[]>("/api/tasks/pending", { user }),

  managerAll: (user: User, status?: string, meetingId?: string) => {
    let url = `/api/tasks/manager?`;
    if (status) url += `status=${status}&`;
    if (meetingId) url += `meeting_id=${meetingId}`;
    return request<any[]>(url, { user });
  },

  developerTasks: (user: User) =>
    request<any[]>(`/api/tasks/developer/${user.id}`, { user }),

  updateFull: (user: User, taskId: string, data: any) =>
    request(`/api/tasks/${taskId}`, {
      method: "PUT",
      user,
      body: JSON.stringify(data),
    }),

  confirm: (
    user: User,
    taskId: string,
    data: {
      assigned_to: string;
      description: string;
      priority: string;
      deadline?: string;
      manager_notes?: string;
      assignees_list?: string[];
    }
  ) =>
    request(`/api/tasks/${taskId}/confirm`, {
      method: "POST",
      user,
      body: JSON.stringify(data),
    }),

  reject: (user: User, taskId: string) =>
    request(`/api/tasks/${taskId}/reject`, { method: "POST", user }),

  updateStatus: (user: User, taskId: string, status: string, notes?: string) =>
    request(`/api/tasks/${taskId}/status`, {
      method: "PATCH",
      user,
      body: JSON.stringify({ status, notes }),
    }),

  appendNote: (
    user: User,
    taskId: string,
    note_text: string,
    sender_icon: string,
    sender_label: string
  ) =>
    request(`/api/tasks/${taskId}/note`, {
      method: "POST",
      user,
      body: JSON.stringify({ note_text, sender_icon, sender_label }),
    }),

  getThread: (user: User, taskId: string) =>
    request<{ thread: any[] }>(`/api/tasks/${taskId}/thread`, { user }),

  delete: (user: User, taskId: string) =>
    request(`/api/tasks/${taskId}`, { method: "DELETE", user }),

  githubSync: (user: User, taskId: string, assignee_github_handle?: string) =>
    request<{ github_issue_url: string }>(`/api/tasks/${taskId}/github-sync`, {
      method: "POST",
      user,
      body: JSON.stringify({ task_id: taskId, assignee_github_handle }),
    }),

  githubSyncAll: (user: User) =>
    request<{ success: boolean; created: number; failed: number; failed_details?: Array<{ task_id?: string; description?: string; error?: string }> }>(`/api/tasks/github-sync-all`, {
      method: "POST",
      user,
    }),

  developerGithubSyncAll: (user: User) =>
    request<{ success: boolean; created: number; failed: number; failed_details?: Array<{ task_id?: string; description?: string; error?: string }> }>(`/api/tasks/developer/${user.id}/github-sync-all`, {
      method: "POST",
      user,
    }),

  aiSuggestStatus: (user: User, taskId: string, note?: string) =>
    request<{
      current_status: string;
      suggested_status: string;
      changed: boolean;
      based_on_note: string;
    }>(`/api/tasks/${taskId}/ai-suggest-status`, {
      method: "POST",
      user,
      body: JSON.stringify({ note }),
    }),
};

// ── AI Assistant ────────────────────────────────────────────────────────────
export const helpApi = {
  query: (user: User, question: string, mode: "question" | "command" = "question") =>
    request<{ response: string; mode: "question" | "command" }>("/api/help/query", {
      method: "POST",
      user,
      body: JSON.stringify({ question, mode }),
    }),
};

export type { User, LeaderboardRow };
