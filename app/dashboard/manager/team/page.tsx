"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Sidebar from "@/components/Sidebar";
import { useToast } from "@/components/Toast";
import { authApi } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/dashboard/manager", icon: "📊", label: "Overview" },
  { href: "/dashboard/manager/pending", icon: "⏳", label: "Pending Review" },
  { href: "/dashboard/manager/tasks", icon: "📋", label: "All Tasks" },
  { href: "/dashboard/manager/meetings", icon: "🎤", label: "Meetings" },
  { href: "/dashboard/manager/team", icon: "👥", label: "Team" },
];

export default function TeamPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();
  const [developers, setDevelopers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [username, setUsername] = useState("");
  const [github, setGithub] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await authApi.getDevelopers(user);
      setDevelopers(data);
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await authApi.createDeveloper(user!, { username, github_handle: github });
      showToast(`Developer "${username}" created with password "dev123"`, "success");
      setUsername("");
      setGithub("");
      load();
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="app-shell">
      <Sidebar navItems={NAV_ITEMS} />
      <main className="main-content">
        <ToastContainer />
        <div className="topbar">
          <div className="topbar-title">
            <h2>👥 Team Management</h2>
            <p>{developers.length} developers on your team</p>
          </div>
        </div>

        <div className="page-container">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Add Developer */}
            <div className="card">
              <h3 className="section-title" style={{ marginBottom: 20 }}>➕ Add Developer</h3>
              <form onSubmit={handleCreate}>
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input
                    id="dev-username"
                    className="form-input"
                    placeholder="e.g. john_dev"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">GitHub Handle (optional)</label>
                  <input
                    id="dev-github"
                    className="form-input"
                    placeholder="e.g. john-dev"
                    value={github}
                    onChange={e => setGithub(e.target.value)}
                  />
                </div>
                <div style={{
                  background: "rgba(99, 102, 241, 0.08)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: 12,
                  marginBottom: 16,
                  fontSize: 12,
                  color: "var(--text-muted)"
                }}>
                  💡 Default password will be <code style={{ color: "var(--text-accent)" }}>dev123</code>.
                  Developer can sign in and change it.
                </div>
                <button
                  id="create-dev-btn"
                  type="submit"
                  className="btn btn-primary btn-full"
                  disabled={creating}
                >
                  {creating ? <span className="spinner" /> : "👤 Create Developer Account"}
                </button>
              </form>
            </div>

            {/* Developer List */}
            <div className="card">
              <div className="section-header">
                <h3 className="section-title">🧑‍💻 Current Developers</h3>
                <button className="btn btn-ghost btn-sm" onClick={load}>↻</button>
              </div>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 60, marginBottom: 10, borderRadius: "var(--radius)" }} />
                ))
              ) : developers.length === 0 ? (
                <div className="empty-state" style={{ padding: 40 }}>
                  <div className="empty-state-icon">👥</div>
                  <h3>No developers yet</h3>
                  <p>Add your first team member</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {developers.map(dev => (
                    <div key={dev.id} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      background: "var(--bg-elevated)",
                      borderRadius: "var(--radius)",
                      padding: "12px 16px",
                      border: "1px solid var(--border)",
                    }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: "50%",
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, fontWeight: 700, color: "white", flexShrink: 0
                      }}>
                        {dev.username.slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>
                          {dev.username}
                        </p>
                        {dev.github_handle && (
                          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            🐙 github.com/{dev.github_handle}
                          </p>
                        )}
                      </div>
                      <span className="badge badge-confirmed">Developer</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
