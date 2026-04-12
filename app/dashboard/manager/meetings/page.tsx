"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Sidebar from "@/components/Sidebar";
import { useToast } from "@/components/Toast";
import { meetingsApi } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/dashboard/manager", icon: "📊", label: "Overview" },
  { href: "/dashboard/manager/pending", icon: "⏳", label: "Pending Review" },
  { href: "/dashboard/manager/tasks", icon: "📋", label: "All Tasks" },
  { href: "/dashboard/manager/meetings", icon: "🎤", label: "Meetings" },
  { href: "/dashboard/manager/team", icon: "👥", label: "Team" },
];

export default function MeetingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);

  // Upload form
  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await meetingsApi.list(user);
      setMeetings(data);
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

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !transcript.trim()) return;
    setUploading(true);
    try {
      const res = await meetingsApi.upload(user!, {
        title: title.trim(),
        transcript: transcript.trim(),
        uploaded_by: user!.id,
        attendees: [],
      });
      showToast("Meeting saved! Running AI extraction...", "info");
      setUploading(false);
      setExtracting(true);
      try {
        const extracted = await meetingsApi.extract(user!, res.meeting_id, transcript.trim());
        showToast(`✨ Extracted ${extracted.tasks_extracted} tasks! Check Pending Review.`, "success");
      } catch (e: any) {
        showToast(`Extraction failed: ${e.message}`, "error");
      } finally {
        setExtracting(false);
        setTitle("");
        setTranscript("");
        load();
      }
    } catch (e: any) {
      showToast(e.message, "error");
      setUploading(false);
    }
  }

  return (
    <div className="app-shell">
      <Sidebar navItems={NAV_ITEMS} />
      <main className="main-content">
        <ToastContainer />
        <div className="topbar">
          <div className="topbar-title">
            <h2>🎤 Meeting Transcripts</h2>
            <p>Upload transcripts to extract tasks automatically</p>
          </div>
        </div>

        <div className="page-container">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Upload Form */}
            <div className="card">
              <h3 className="section-title" style={{ marginBottom: 20 }}>📤 Upload New Meeting</h3>
              <form onSubmit={handleUpload}>
                <div className="form-group">
                  <label className="form-label">Meeting Title</label>
                  <input
                    id="meeting-title"
                    className="form-input"
                    placeholder="Q2 Sprint Planning, April 12"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Meeting Transcript</label>
                  <textarea
                    id="meeting-transcript"
                    className="form-textarea"
                    placeholder="Paste the full meeting transcript here..."
                    value={transcript}
                    onChange={e => setTranscript(e.target.value)}
                    style={{ minHeight: 200 }}
                    required
                  />
                </div>

                {extracting && (
                  <div style={{
                    background: "var(--bg-elevated)",
                    borderRadius: "var(--radius)",
                    padding: 16,
                    marginBottom: 16,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    border: "1px solid var(--border-bright)"
                  }}>
                    <div className="spinner" />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Running AI Extraction...</p>
                      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>This may take up to 30 seconds</p>
                    </div>
                  </div>
                )}

                <button
                  id="upload-meeting-btn"
                  type="submit"
                  className="btn btn-primary btn-full"
                  disabled={uploading || extracting}
                >
                  {uploading ? <><span className="spinner" /> Saving...</> :
                   extracting ? <><span className="spinner" /> Extracting...</> :
                   "🤖 Upload & Extract Tasks"}
                </button>
              </form>
            </div>

            {/* Meeting List */}
            <div className="card">
              <div className="section-header">
                <h3 className="section-title">📚 Past Meetings</h3>
                <button className="btn btn-ghost btn-sm" onClick={load}>↻</button>
              </div>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 72, marginBottom: 10, borderRadius: "var(--radius)" }} />
                ))
              ) : meetings.length === 0 ? (
                <div className="empty-state" style={{ padding: 40 }}>
                  <div className="empty-state-icon">🎤</div>
                  <h3>No meetings yet</h3>
                  <p>Upload your first transcript</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {meetings.map(m => (
                    <div key={m.id} style={{
                      background: "var(--bg-elevated)",
                      borderRadius: "var(--radius)",
                      padding: "12px 16px",
                      border: "1px solid var(--border)",
                    }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)", marginBottom: 4 }}>
                        🎤 {m.title}
                      </p>
                      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        📅 {new Date(m.created_at).toLocaleDateString()}
                        {m.attendees?.length > 0 && ` · 👥 ${m.attendees.length} attendees`}
                      </p>
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
