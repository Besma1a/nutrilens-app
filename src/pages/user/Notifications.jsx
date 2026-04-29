import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Trash2, Loader } from "lucide-react";
import { notificationsApi } from "../../services/api";

const TYPE_ICON = {
  appointment: "🗓️",
  plan: "📋",
  message: "💬",
  progress: "📊",
  alert: "⚠️",
  report: "📊",
  scan: "📸",
  weight: "⚖️",
  system: "🔔",
};

function getDateGroup(createdAt) {
  const now = new Date();
  const date = new Date(createdAt);
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 7) return "This Week";
  return "Earlier";
}

function formatTime(createdAt) {
  const date = new Date(createdAt);
  const diffMs = Date.now() - date;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} days ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const card = {
  background: "white",
  border: "1px solid var(--border)",
  borderRadius: "var(--r-lg)",
  boxShadow: "var(--shadow-sm)",
};

export default function Notifications() {
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [deleting, setDeleting] = useState(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await notificationsApi.list();
      setNotifs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setError("Failed to load notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markRead = async (id) => {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    try {
      await notificationsApi.markRead(id);
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
      setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: false } : n)));
    }
  };

  const markAllRead = async () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await notificationsApi.markAllRead();
    } catch (err) {
      console.error("Failed to mark all as read:", err);
      fetchNotifications();
    }
  };

  const deleteNotif = async (id) => {
    const confirmed = window.confirm("Delete this notification?");
    if (!confirmed) return;

    setDeleting(id);
    setNotifs((prev) => prev.filter((n) => n.id !== id));
    try {
      await notificationsApi.delete(id);
    } catch (err) {
      console.error("Failed to delete notification:", err);
      fetchNotifications();
    } finally {
      setDeleting(null);
    }
  };

  const unreadCount = notifs.filter((n) => !n.is_read).length;
  const displayed = filter === "unread" ? notifs.filter((n) => !n.is_read) : notifs;
  const grouped = displayed.reduce((acc, notif) => {
    const group = getDateGroup(notif.created_at);
    if (!acc[group]) acc[group] = [];
    acc[group].push(notif);
    return acc;
  }, {});
  const GROUP_ORDER = ["Today", "Yesterday", "This Week", "Earlier"];
  const sortedGroups = Object.keys(grouped).sort(
    (a, b) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b)
  );

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <button
          onClick={() => navigate("/user/dashboard")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            borderRadius: "var(--r-md)",
            border: "1px solid var(--border)",
            background: "white",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            color: "var(--gray-600)",
          }}
        >
          <ArrowLeft size={15} /> Back
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {unreadCount > 0 && (
            <>
              <span style={{ background: "var(--red)", color: "white", fontSize: 12, fontWeight: 700, padding: "3px 9px", borderRadius: 999 }}>
                {unreadCount} new
              </span>
              <button
                onClick={markAllRead}
                style={{
                  padding: "8px 18px",
                  borderRadius: "var(--r-md)",
                  background: "var(--green-light)",
                  color: "var(--green-dark)",
                  border: "1px solid var(--green-mid)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ✓ Mark all as read
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, background: "var(--gray-100)", borderRadius: "var(--r-lg)", padding: 4, width: "fit-content", marginBottom: 20 }}>
        {[["all", "All"], ["unread", "Unread"]].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            style={{
              padding: "8px 20px",
              borderRadius: "var(--r-md)",
              border: "none",
              fontSize: 13.5,
              fontWeight: filter === val ? 600 : 500,
              color: filter === val ? "var(--gray-800)" : "var(--gray-500)",
              background: filter === val ? "white" : "transparent",
              boxShadow: filter === val ? "var(--shadow-sm)" : "none",
              cursor: "pointer",
            }}
          >
            {label} {val === "unread" && unreadCount > 0 && `(${unreadCount})`}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ ...card, padding: "80px 20px", textAlign: "center" }}>
          <Loader size={32} color="var(--gray-300)" style={{ margin: "0 auto 16px", animation: "spin 1s linear infinite" }} />
          <div style={{ fontSize: 14, color: "var(--gray-400)" }}>Loading notifications...</div>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {!loading && error && (
        <div style={{ ...card, padding: "40px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "var(--red)", marginBottom: 12 }}>{error}</div>
          <button
            onClick={fetchNotifications}
            style={{ padding: "9px 22px", borderRadius: "var(--r-md)", border: "1px solid var(--border)", background: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && sortedGroups.length === 0 && (
        <div style={{ ...card, padding: "80px 20px", textAlign: "center" }}>
          <Bell size={48} color="var(--gray-200)" style={{ margin: "0 auto 16px" }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--gray-400)" }}>
            {filter === "unread" ? "No unread notifications" : "No notifications"}
          </div>
          <div style={{ fontSize: 13, color: "var(--gray-300)", marginTop: 6 }}>You're all caught up!</div>
        </div>
      )}

      {!loading && !error && sortedGroups.length > 0 && (
        <div style={card}>
          {sortedGroups.map((group) => (
            <div key={group}>
              <div style={{ padding: "14px 20px", background: "var(--gray-50)", fontSize: 12, fontWeight: 600, color: "var(--gray-500)", borderBottom: "1px solid var(--border-light)" }}>
                {group}
              </div>

              {grouped[group].map((n, i) => {
                const icon = TYPE_ICON[n.notification_type] || "🔔";
                const isLast = i === grouped[group].length - 1;

                return (
                  <div
                    key={n.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 16,
                      padding: "16px 20px",
                      borderBottom: !isLast ? "1px solid var(--border-light)" : "none",
                      background: !n.is_read ? "rgba(78,154,120,0.05)" : "white",
                      cursor: "pointer",
                      transition: "background .15s",
                      opacity: deleting === n.id ? 0.4 : 1,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--gray-50)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = !n.is_read ? "rgba(78,154,120,0.05)" : "white";
                    }}
                    onClick={() => !n.is_read && markRead(n.id)}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: "var(--r-md)", background: "var(--gray-50)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                      {icon}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: !n.is_read ? 600 : 500, color: "var(--gray-800)", marginBottom: 4 }}>
                        {n.title}
                      </div>
                      {n.message && <div style={{ fontSize: 13, color: "var(--gray-600)", marginBottom: 6 }}>{n.message}</div>}
                      <div style={{ fontSize: 12, color: "var(--gray-400)" }}>
                        {formatTime(n.created_at)}
                        {n.actor_name && <span style={{ marginLeft: 8, color: "var(--gray-300)" }}>· {n.actor_name}</span>}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {!n.is_read && <div style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--green)", flexShrink: 0 }} />}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotif(n.id);
                        }}
                        disabled={deleting === n.id}
                        style={{ width: 32, height: 32, borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: deleting === n.id ? "not-allowed" : "pointer", color: "var(--gray-400)" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "var(--red-light)";
                          e.currentTarget.style.color = "var(--red)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "white";
                          e.currentTarget.style.color = "var(--gray-400)";
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
