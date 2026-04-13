"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { authApi } from "@/lib/api";

export default function LoginPage() {
  const { setUser } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Login form
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Signup form
  const [sUsername, setSUsername] = useState("");
  const [sPassword, setSPassword] = useState("");
  const [sGithub, setSGithub] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await authApi.login(username, password);
      setUser(user);
      router.push(user.role === "manager" ? "/dashboard/manager" : "/dashboard/developer");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!sUsername || !sPassword || !sGithub) {
      setError("All fields are required.");
      return;
    }
    setLoading(true);
    try {
      await authApi.signup(sUsername, sPassword, sGithub);
      setSuccess("Account created! You can now sign in.");
      setTab("login");
      setUsername(sUsername);
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">🟠</span>
          <h1>Automated Task Manager Manager OS</h1>
          <p>Meeting intelligence to AI actions to team execution</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${tab === "login" ? "active" : ""}`}
            onClick={() => { setTab("login"); setError(""); setSuccess(""); }}
          >
            🔑 Sign In
          </button>
          <button
            className={`auth-tab ${tab === "signup" ? "active" : ""}`}
            onClick={() => { setTab("signup"); setError(""); setSuccess(""); }}
          >
            📝 Create Account
          </button>
        </div>

        {error && (
          <div className="toast toast-error" style={{ position: "static", marginBottom: 16, animation: "none" }}>
            <span>⚠️</span> {error}
          </div>
        )}
        {success && (
          <div className="toast toast-success" style={{ position: "static", marginBottom: 16, animation: "none" }}>
            <span>✅</span> {success}
          </div>
        )}

        {tab === "login" ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                id="login-username"
                className="form-input"
                placeholder="e.g. manager1"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                id="login-password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : "Sign In →"}
            </button>
            <div style={{ marginTop: 20, padding: 14, background: "var(--bg-elevated)", borderRadius: "var(--radius)", fontSize: 12, color: "var(--text-muted)" }}>
              <strong style={{ color: "var(--text-secondary)" }}>Demo credentials:</strong><br />
              Manager: <code style={{ color: "var(--text-accent)" }}>manager1 / manager123</code><br />
              Developer: <code style={{ color: "var(--text-accent)" }}>akshay / dev123</code>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSignup}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                id="signup-username"
                className="form-input"
                placeholder="Choose a username"
                value={sUsername}
                onChange={e => setSUsername(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                id="signup-password"
                type="password"
                className="form-input"
                placeholder="Choose a password"
                value={sPassword}
                onChange={e => setSPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">GitHub Username</label>
              <input
                id="signup-github"
                className="form-input"
                placeholder="e.g. akshay-dev"
                value={sGithub}
                onChange={e => setSGithub(e.target.value)}
                required
              />
            </div>
            <button
              id="signup-submit"
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : "Create Account →"}
            </button>
            <p style={{ marginTop: 14, fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
              💡 Developer accounts are automatically synced with the Manager's dashboard
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
