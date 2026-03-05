import { useState, useRef, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuthContext } from "../auth/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import "./Layout.css";

function formatTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}

export default function Layout() {
  const { user, clearAuth } = useAuthContext();
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();
  const navigate = useNavigate();
  const [notifyOpen, setNotifyOpen] = useState(false);
  const notifyRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifyRef.current && !notifyRef.current.contains(e.target)) {
        setNotifyOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = () => {
    clearAuth();
    navigate("/login", { replace: true });
  };

  const firstName = user?.full_name?.split(/\s+/)[0] || "User";
  const initials = user?.full_name
    ? user.full_name
        .split(/\s+/)
        .map((s) => s[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className="app-layout">
      <header className="app-header">
        <NavLink to="/dashboard" className="app-header-logo">
          Mahyco<span>.</span>
        </NavLink>
        <div className="app-header-right">
          <div className="app-header-notify-wrap" ref={notifyRef}>
            <button
              type="button"
              className="app-header-notify"
              aria-label="Notifications"
              aria-expanded={notifyOpen}
              onClick={() => setNotifyOpen((o) => !o)}
            >
              {unreadCount > 0 && (
                <span className="app-header-notify-badge">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
              🔔
            </button>
            {notifyOpen && (
              <div className="app-header-notify-dropdown">
                <div className="app-header-notify-dropdown-head">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <button type="button" className="app-header-notify-mark" onClick={markAllRead}>
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="app-header-notify-dropdown-list">
                  {notifications.length === 0 ? (
                    <div className="app-header-notify-empty">No notifications yet.</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`app-header-notify-item ${n.type} ${n.read ? "read" : ""}`}
                        onClick={() => markAsRead(n.id)}
                      >
                        <span className="app-header-notify-item-icon">
                          {n.type === "progress" && "⏳"}
                          {n.type === "completed" && "✓"}
                          {n.type === "error" && "!"}
                          {n.type === "info" && "ℹ"}
                        </span>
                        <div className="app-header-notify-item-body">
                          <span className="app-header-notify-item-msg">{n.message}</span>
                          {n.filename && (
                            <span className="app-header-notify-item-file">{n.filename}</span>
                          )}
                          <span className="app-header-notify-item-time">{formatTime(n.createdAt)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="app-header-user">
            <div className="app-header-greeting">
              Hello! <strong>{firstName}</strong>
            </div>
            <div className="app-header-avatar">{initials}</div>
          </div>
        </div>
      </header>
      <aside className="app-sidebar">
        <NavLink to="/dashboard" className="app-sidebar-brand">
          <div className="app-sidebar-brand-icon">🌾</div>
          <span>Mahyco</span>
        </NavLink>
        <nav className="app-sidebar-nav">
          <a href="/" className="app-sidebar-nav-link">
            <span className="app-sidebar-nav-icon">⌂</span>
            <span>Home</span>
          </a>
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <span className="app-sidebar-nav-icon">◫</span>
            <span>Dashboard</span>
          </NavLink>
        </nav>
        <div className="app-sidebar-footer">
          <button type="button" onClick={handleSignOut}>
            <span>⎋</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>
      <div className="app-main-wrap">
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
