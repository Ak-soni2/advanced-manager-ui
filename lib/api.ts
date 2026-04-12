// lib/api.ts - Centralized API client for the Automated Task Manager backend

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface User {
  id: string;
  username: string;
  role: "manager" | "developer";
  github_handle?: string;
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

  managerAll: (user: User, status?: string) =>
    request<any[]>(`/api/tasks/manager${status ? `?status=${status}` : ""}`, { user }),

  developerTasks: (user: User) =>
    request<any[]>(`/api/tasks/developer/${user.id}`, { user }),

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
};

export type { User };
