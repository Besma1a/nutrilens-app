import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AdminUiContext } from "./adminUtils";
import DashboardOverview  from "./DashboardOverview";
import UsersPage          from "./UsersPage";
import NutritionistsPage  from "./NutritionistsPage";
import SubscriptionsPage  from "./SubscriptionsPage";
import ContentPage        from "./ContentPage";
import SupportPage        from "./SupportPage";
import RevenuePage        from "./RevenuePage";
import TestimonialsPage   from "./TestimonialsPage";
import AdminProfilePage   from "./AdminProfilePage";
import { adminApi } from "../../services/adminApi";

// ─── Nav Config ───────────────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      {
        id: "dashboard", label: "Dashboard",
        icon: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></>,
      },
    ],
  },
  {
    label: "Management",
    items: [
      { id: "users",         label: "Users",         icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></> },
      { id: "nutritionists", label: "Nutritionists", icon: <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="12" y1="11" x2="12" y2="15"/><line x1="10" y1="13" x2="14" y2="13"/></> },
      { id: "subscriptions", label: "Subscriptions", icon: <><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></> },
      { id: "content",       label: "Content",       icon: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></> },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "support",      label: "Support",      icon: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/> },
      { id: "revenue",      label: "Revenue",            icon: <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></> },
      { id: "testimonials", label: "Testimonials",        icon: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/> },
    ],
  },
  
];

const PAGE_MAP = {
  dashboard:     <DashboardOverview />,
  users:         <UsersPage />,
  nutritionists: <NutritionistsPage />,
  subscriptions: <SubscriptionsPage />,
  content:       <ContentPage />,
  support:       <SupportPage />,
  revenue:       <RevenuePage />,
  testimonials:  <TestimonialsPage />,
  profile:       <AdminProfilePage />,
};

const META = {
  dashboard:     { title: "Dashboard",     sub: "Platform overview and operational health" },
  users:         { title: "Users",         sub: "Manage member accounts and user activity" },
  nutritionists: { title: "Nutritionists", sub: "Review professionals and patient assignments" },
  subscriptions: { title: "Subscriptions", sub: "Plans, billing tiers, and promotions" },
  content:       { title: "Content",       sub: "Review education assets and publishing flow" },
  support:       { title: "Support",       sub: "Track and resolve support tickets" },
  revenue:       { title: "Revenue",       sub: "Revenue trends and payout reporting" },
  testimonials:  { title: "Testimonials",  sub: "Moderate public reviews and feedback" },
  profile:       { title: "Admin Profile", sub: "Account settings and administrator details" },
};

function Icon({ children, className = "si" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

// ─── Root Shell ───────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  // Derive active page from the URL so refresh always lands on the right page.
  // /admin → "dashboard", /admin/revenue → "revenue", etc.
  const page = location.pathname.split("/").filter(Boolean).pop() || "dashboard";
  const setPage = (id) => navigate(`/admin/${id}`);
  const [admin, setAdmin] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("adminUser") || "null");
    } catch {
      return null;
    }
  });

  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifItems, setNotifItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { title, sub } = META[page] || { title: "Admin", sub: "" };
  const initials = useMemo(() => {
    const name = admin?.name || "Admin User";
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [admin]);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    adminApi
      .me()
      .then((res) => {
        setAdmin(res);
        localStorage.setItem("adminUser", JSON.stringify(res));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;

    const fetchNotifs = () =>
      adminApi
        .notifications({ limit: 10 })
        .then((data) => {
          if (!alive) return;
          setNotifItems(data.items || []);
          setUnreadCount(Number(data.unreadCount || 0));
        })
        .catch(() => {});

    fetchNotifs();
    const t = setInterval(fetchNotifs, 8000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    if (!notifOpen) return;
    if (!unreadCount) return;
    adminApi
      .markAllNotificationsRead()
      .then(() => setUnreadCount(0))
      .catch(() => {});
  }, [notifOpen, unreadCount]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "white" }}>
      <aside className={`sb${open ? " open" : ""}`}>
        <div
          className="sb-brand"
          role="button"
          tabIndex={0}
          onClick={() => navigate("/")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/"); } }}
          style={{ cursor: "pointer" }}
        >
          <div className="sb-mark">
            <svg viewBox="0 0 60 60">
              <path style={{ fill: "white", stroke: "none" }} d="M30,30 L45.6,14.4 A22,22 0 0,1 45.6,45.6 Z"/>
              <path style={{ fill: "white", stroke: "none" }} d="M30,30 L45.6,14.4 A22,22 0 0,1 45.6,45.6 Z" transform="rotate(120 30 30)"/>
              <path style={{ fill: "white", stroke: "none" }} d="M30,30 L45.6,14.4 A22,22 0 0,1 45.6,45.6 Z" transform="rotate(240 30 30)"/>
              <circle cx="30" cy="30" r="10" style={{ fill: "#2B5726", stroke: "none" }}/>
              <path style={{ fill: "#DEE660", stroke: "none" }} d="M30,24 C32,24 35,26 35,29 C35,32 32,34 30,34 C28,34 25,32 25,29 C25,26 28,24 30,24Z"/>
            </svg>
          </div>
          <div className="sb-wordmark">Nutri<span>Lens</span></div>
        </div>

        <nav className="sb-nav">
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <div className="sb-section">{group.label}</div>
              {group.items.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setPage(item.id); setOpen(false); }}
                  className={`sb-item${page === item.id ? " active" : ""}`}
                  style={{ width: "100%", border: "none", textAlign: "left",background: "transparent",
      boxShadow: "none",
      padding: "10px 16px",
      borderRadius: "8px",
      transition: "background 0.2s", }}
                >
                  <Icon>{item.icon}</Icon>
                  <span style={{ flex: 1, lineHeight: 1.2 }}>{item.label}</span>
                  {item.badge ? <span className="sb-badge">{item.badge}</span> : null}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sb-footer">
          <div className="sb-user" role="button" tabIndex={0} onClick={() => setPage("profile")} title="View profile">
            <div className="sb-av">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sb-user-name">{admin?.name || "Admin User"}</div>
              
            </div>
          </div>
        </div>
      </aside>

      {open ? <div className="sidebar-backdrop" onClick={() => setOpen(false)} role="presentation" /> : null}

      <main className="main">
        <header className="hdr">
          <button type="button" className="mobile-menu-btn" onClick={() => setOpen(true)} aria-label="Open menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 18, height: 18 }}>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div className="hdr-title">
            <div className="hdr-page">{title}</div>
            {sub ? <div className="hdr-sub">{sub}</div> : null}
          </div>

          {/* FIX: search is now decorative in the header shell — each page manages its own search state.
              Removed value/onChange binding that pointed to removed dead state. */}
          <div className="hdr-search">
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              placeholder="Search users, plans, tickets…"
              aria-label="Search"
              type="search"
              readOnly
              onFocus={e => e.target.removeAttribute("readonly")}
            />
          </div>

          {notifOpen ? (
            <div
              role="presentation"
              onClick={() => setNotifOpen(false)}
              style={{ position: "fixed", inset: 0, zIndex: 50 }}
            />
          ) : null}

          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="hdr-btn"
              aria-label="Notifications"
              onClick={() => setNotifOpen((v) => !v)}
              style={{ position: "relative" }}
            >
              <svg viewBox="0 0 24 24">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 ? (
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: "#ef4444",
                    boxShadow: "0 0 0 2px white",
                  }}
                />
              ) : null}
            </button>

            {notifOpen ? (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 10px)",
                  width: 360,
                  maxWidth: "min(360px, 90vw)",
                  background: "white",
                  border: "1px solid rgba(15, 23, 42, 0.12)",
                  borderRadius: 14,
                  boxShadow: "0 12px 40px rgba(2,6,23,0.18)",
                  zIndex: 60,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "12px 14px",
                    borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div style={{ fontWeight: 800, color: "#0f172a" }}>Notifications</div>
                  <button
                    type="button"
                    onClick={() => adminApi.markAllNotificationsRead().then(() => setUnreadCount(0)).catch(() => {})}
                    style={{
                      border: "1px solid rgba(15, 23, 42, 0.12)",
                      background: "white",
                      padding: "6px 10px",
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Mark all read
                  </button>
                </div>

                <div style={{ maxHeight: 360, overflow: "auto" }}>
                  {notifItems.length === 0 ? (
                    <div style={{ padding: 14, color: "#64748b" }}>No notifications yet.</div>
                  ) : (
                    notifItems.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          setNotifOpen(false);
                          const link = (n.link || "").trim();
                          if (link.startsWith("/admin#")) {
                            const hash = link.replace("/admin", "");
                            if (hash === "#support") setPage("support");
                            else if (hash === "#content") setPage("content");
                            else if (hash === "#testimonials") setPage("testimonials");
                            else setPage("dashboard");
                          }
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          border: "none",
                          background: "transparent",
                          padding: "12px 14px",
                          cursor: "pointer",
                          borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                          <div
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 999,
                              marginTop: 6,
                              background: n.isRead ? "rgba(148,163,184,0.7)" : "#ef4444",
                              flex: "0 0 auto",
                            }}
                            aria-hidden
                          />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 13 }}>
                              {n.title}
                            </div>
                            {n.message ? (
                              <div style={{ color: "#475569", fontSize: 12, marginTop: 2, lineHeight: 1.35 }}>
                                {n.message}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="hdr-av" role="button" tabIndex={0} title={admin?.name || "Admin User"} onClick={() => setPage("profile")} aria-label="Your profile">
            {initials}
          </div>
        </header>

        <div className="content">
          <div className="nl-wrap">
            <AdminUiContext.Provider value={{ showPageHead: false, admin }}>
              {PAGE_MAP[page]}
            </AdminUiContext.Provider>
          </div>
        </div>
      </main>
    </div>
  );
}