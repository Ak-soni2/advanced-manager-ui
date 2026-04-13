"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { helpApi } from "@/lib/api";

interface NavItem {
  href: string;
  icon: string;
  label: string;
  badge?: number;
}

interface SidebarProps {
  navItems: NavItem[];
}

export default function Sidebar({ navItems }: SidebarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantMode, setAssistantMode] = useState<"question" | "command">("question");
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantReply, setAssistantReply] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  async function handleAskAssistant() {
    if (!user || assistantLoading) return;
    const question = assistantInput.trim();
    if (!question) return;

    setAssistantLoading(true);
    try {
      const res = await helpApi.query(user, question, assistantMode);
      setAssistantReply(res.response || "No response available.");
    } catch (e: any) {
      setAssistantReply(e?.message || "Assistant is unavailable right now.");
    } finally {
      setAssistantLoading(false);
    }
  }

  const initials = user?.username?.slice(0, 2).toUpperCase() || "??";

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🟠</div>
        <h1>Automated Task Manager</h1>
        <p>Delivery Intelligence</p>
      </div>

      <div className="sidebar-user">
        <div className="user-avatar">{initials}</div>
        <div className="user-info">
          <h3>{user?.username}</h3>
          <span>🏷️ {user?.role}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {navItems.map(item => (
          <a
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname === item.href ? "active" : ""}`}
            onClick={e => { e.preventDefault(); router.push(item.href); }}
          >
            <span className="nav-item-icon">{item.icon}</span>
            {item.label}
            {item.badge !== undefined && item.badge > 0 && (
              <span className="nav-badge">{item.badge}</span>
            )}
          </a>
        ))}
      </nav>

      <div className="sidebar-assistant">
        <button
          className="btn btn-secondary btn-full sidebar-assistant-toggle"
          onClick={() => setAssistantOpen(v => !v)}
          type="button"
        >
          <span>🤖</span>
          AI Assistant {assistantOpen ? "●" : "○"}
        </button>

        {assistantOpen && (
          <div className="sidebar-assistant-panel">
            <p className="sidebar-assistant-copy">
              Ask about workflows, roles, and metrics, or run command-style queries over your app data.
            </p>

            <div className="sidebar-assistant-modes">
              <button
                type="button"
                className={`btn btn-sm ${assistantMode === "question" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setAssistantMode("question")}
              >
                Q&A
              </button>
              <button
                type="button"
                className={`btn btn-sm ${assistantMode === "command" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setAssistantMode("command")}
              >
                Command
              </button>
            </div>

            <textarea
              className="form-textarea sidebar-assistant-input"
              value={assistantInput}
              onChange={e => setAssistantInput(e.target.value)}
              placeholder={
                assistantMode === "question"
                  ? "How do I assign a task?"
                  : "Show all high priority tasks"
              }
            />

            <button
              type="button"
              className="btn btn-primary btn-full"
              onClick={handleAskAssistant}
              disabled={assistantLoading || !assistantInput.trim()}
            >
              {assistantLoading ? <span className="spinner" /> : "Send"}
            </button>

            {assistantReply && (
              <div className="sidebar-assistant-reply">
                {assistantReply}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        <button
          id="sidebar-logout-btn"
          className="btn btn-ghost btn-full"
          onClick={handleLogout}
          style={{ justifyContent: "flex-start", gap: 10 }}
        >
          <span>🚪</span> Sign Out
        </button>
      </div>
    </aside>
  );
}
