"use client";
import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";

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

  function handleLogout() {
    logout();
    router.push("/login");
  }

  const initials = user?.username?.slice(0, 2).toUpperCase() || "??";

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🎤</div>
        <h1>Task Manager</h1>
        <p>AI-Powered Automation</p>
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
