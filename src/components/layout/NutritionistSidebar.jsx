import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ToastProvider, useToast } from './Toast';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../common/Avatar';

/* ─── API config — set VITE_API_BASE_URL in .env ──────────────────────────── */
export const API_CONFIG = {
  baseUrl: import.meta.env?.VITE_API_BASE_URL ?? '/api',
  wsUrl:   import.meta.env?.VITE_WS_URL        ?? 'wss://localhost/ws',
};

function getInitials(name) {
  const cleaned = (name || '').trim();
  if (!cleaned) return 'NU';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || '';
  const second = parts.length > 1 ? (parts[1]?.[0] || '') : (parts[0]?.[1] || '');
  const out = (first + second).toUpperCase();
  return out || 'NU';
}

/* ─── useUnreadCounts ──────────────────────────────────────────────────────
   Drives sidebar badges + notification dot.
   TODO: replace with WebSocket or polling against your notifications endpoint.
────────────────────────────────────────────────────────────────────────── */
function useUnreadCounts() {
  const [counts, setCounts] = useState({ messages: 5, calendar: 3, notifications: 2 });
  // useEffect(() => {
  //   const ws = new WebSocket(API_CONFIG.wsUrl);
  //   ws.onmessage = e => setCounts(JSON.parse(e.data).unread);
  //   return () => ws.close();
  // }, []);
  return counts;
}

/* ─── Icon (unchanged) ─────────────────────────────────────────────────── */
function Icon({ children, className = 'si' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const ICONS = {
  Dashboard:    <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  Patients:     <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  CreatePlan:   <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" /></>,
  Assign:       <><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></>,
  Consultation: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
  Progress:     <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></>,
  Sliders:      <><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></>,
  Messages:     <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>,
  Blog:         <><path d="M4 4h16v16H4z" /><path d="M7 8h10M7 12h6M7 16h6" strokeWidth="1.5" /></>,
  Chevron:      <polyline points="9 18 15 12 9 6" />,
  Menu:         <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>,
};

/* ─── Nav sections ─────────────────────────────────────────────────────── */
const SECTIONS = [
  {
    label: 'Main',
    items: [
      { path: '/nutritionist/dashboard',   icon: 'Dashboard',    label: 'Overview'         },
      { path: '/nutritionist/clients',     icon: 'Patients',     label: 'Patients'         },
      { path: '/nutritionist/create-plan', icon: 'CreatePlan',   label: 'Create Diet Plan' },
      { path: '/nutritionist/assign-plan', icon: 'Assign',       label: 'Assign Plan'      },
    ],
  },
  {
    label: 'Tools',
    items: [
      { path: '/nutritionist/calendar',    icon: 'Consultation', label: 'Calendar',           badgeKey: 'calendar'  },
      { path: '/nutritionist/progress',    icon: 'Progress',     label: 'Progress Monitoring' },
      { path: '/nutritionist/adjustments', icon: 'Sliders',      label: 'Plan Adjustments'    },
      { path: '/nutritionist/messaging',   icon: 'Messages',     label: 'Messaging',          badgeKey: 'messages'  },
      { path: '/nutritionist/blogs',       icon: 'Blog',         label: 'Blog Posts'          },
    ],
  },
];

const META = {
  '/nutritionist/dashboard':    { title: 'Overview',            sub: 'Practice snapshot · Week 13, 2026' },
  '/nutritionist/clients':      { title: 'Patients',            sub: 'Active caseload and engagement'    },
  '/nutritionist/create-plan':  { title: 'Create Diet Plan',    sub: 'Build personalized meal plans'     },
  '/nutritionist/assign-plan':  { title: 'Assign Plan',         sub: 'Send plans to patients'            },
  '/nutritionist/calendar':     { title: 'Calendar',            sub: 'Appointments and follow-ups'       },
  '/nutritionist/progress':     { title: 'Progress Monitoring', sub: 'Track outcomes over time'          },
  '/nutritionist/adjustments':  { title: 'Plan Adjustments',    sub: 'Fine-tune assigned plans'          },
  '/nutritionist/messaging':    { title: 'Messaging',           sub: 'Secure patient communication'      },
  '/nutritionist/profile':      { title: 'Profile',             sub: 'Account and credentials'           },
  '/nutritionist/notifications':{ title: 'Notifications',       sub: 'Alerts and updates'                },
  '/nutritionist/blogs':        { title: 'Blog Posts',         sub: 'Write and publish nutrition articles' },
};

/* ─── Sidebar ───────────────────────────────────────────────────────────── */
function NutritionistSidebar({ nutritionist, open, onClose, unread }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <>
      <aside className={`sb${open ? ' open' : ''}`}>
        <div
          className="sb-brand"
          role="button"
          tabIndex={0}
          onClick={() => { navigate('/'); onClose(); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate('/');
              onClose();
            }
          }}
        >
          <div className="sb-mark">
            <svg viewBox="0 0 24 24">
              <path d="M12 3c.5 5-3 8-6 9 1.5 3 4 5 6 6 2-1 4.5-3 6-6-3-1-6.5-4-6-9z" />
            </svg>
          </div>
          <div className="sb-wordmark">
  Nutri<span style={{ color: "#A50C05" }}>Lens</span>
</div>
        </div>

        <div className="sb-plan">
          <div className="sb-plan-ic">
            <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, fill: 'white' }}>
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
            </svg>
          </div>
          <div>
            <div className="sb-plan-name">Professional</div>
            <div className="sb-plan-days">{nutritionist.title} · {nutritionist.patientsCount} patients</div>
          </div>
        </div>

        <nav className="sb-nav">
          {SECTIONS.map((section) => (
            <div key={section.label}>
              <div className="sb-section">{section.label}</div>
              {section.items.map((item) => {
                const badge = item.badgeKey ? unread[item.badgeKey] : null;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) => `sb-item${isActive ? ' active' : ''}`}
                  >
                    <Icon>{ICONS[item.icon]}</Icon>
                    <span style={{ flex: 1, lineHeight: 1.2 }}>{item.label}</span>
                    {badge > 0 ? <span className="sb-badge">{badge}</span> : null}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sb-footer">
          <div
            className="sb-user"
            role="button"
            tabIndex={0}
            onClick={() => { navigate('/nutritionist/profile'); onClose(); }}
            title="View profile"
          >
            <div className="sb-av">
              <Avatar
                user={nutritionist.user}
                size={32}
                style={{
                  width: "100%",
                  height: "100%",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#fff",
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sb-user-name">{nutritionist.fullName}</div>
              <div className="sb-user-plan">{nutritionist.title} · View Profile →</div>
            </div>
            <svg viewBox="0 0 24 24" className="si" style={{ width: 13, height: 13, color: 'var(--ink-5)', fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
              {ICONS.Chevron}
            </svg>
          </div>
        </div>
      </aside>

      {open ? <div className="sidebar-backdrop" onClick={onClose} role="presentation" /> : null}
    </>
  );
}

/* ─── Layout inner ─────────────────────────────────────────────────────── */
function NutritionistLayoutInner() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch]           = useState('');
  const location    = useLocation();
  const navigate    = useNavigate();
  const toast       = useToast();
  const searchTimer = useRef(null);

  const { user: authUser } = useAuth();
  const unread = useUnreadCounts();

  const nutritionist = useMemo(() => {
    const displayName =
      authUser?.name ||
      `${authUser?.firstName || ''} ${authUser?.lastName || ''}`.trim() ||
      authUser?.username ||
      authUser?.email ||
      'Nutritionist';

    // NOTE: we don’t yet have a dedicated "title" for nutritionists from backend;
    // fall back to a reasonable label.
    const title = authUser?.isNutritionist ? 'Nutritionist' : (authUser?.isStaff ? 'Staff' : 'User');

    return {
      user: authUser,
      fullName: displayName,
      initials: getInitials(displayName),
      title,
      patientsCount: authUser?.patientsCount ?? 0,
    };
  }, [authUser]);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  useEffect(() => { closeSidebar(); }, [location.pathname, closeSidebar]);

  const { title, sub } = META[location.pathname] || { title: 'NutriLens', sub: '' };

  const handleSearch = (e) => {
    const v = e.target.value;
    setSearch(v);
    clearTimeout(searchTimer.current);
    if (v.trim().length > 1) {
      searchTimer.current = setTimeout(() => {
        // TODO: fetch(`${API_CONFIG.baseUrl}/search?q=${encodeURIComponent(v)}`)
        toast({ message: 'Search functionality coming soon! 🔍', type: 'info' });
      }, 400);
    }
  };

  const handleSearchKey = (e) => {
    if (e.key === 'Enter' && search.trim()) {
      clearTimeout(searchTimer.current);
      toast({ message: 'Search functionality coming soon! 🔍', type: 'info' });
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surf)' }}>

      <NutritionistSidebar
        nutritionist={nutritionist}
        open={sidebarOpen}
        onClose={closeSidebar}
        unread={unread}
      />

      <main className="main">
        {/* ── Header ── */}
        <header className="hdr">

          {/* ✅ FIX: hamburger now lives here, flows naturally as first flex child */}
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
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

          <div className="hdr-search">
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              placeholder="Search patients, plans, appointments…"
              value={search}
              onChange={handleSearch}
              onKeyDown={handleSearchKey}
              aria-label="Search"
              type="search"
            />
          </div>

          <button
            type="button"
            className="hdr-btn"
            aria-label={`Notifications${unread.notifications > 0 ? `, ${unread.notifications} new` : ''}`}
            onClick={() => navigate('/nutritionist/notifications')}
          >
            <svg viewBox="0 0 24 24">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unread.notifications > 0 && <span className="hdr-notif-dot" aria-hidden />}
          </button>

          <div
            className="hdr-av"
            role="button"
            tabIndex={0}
            title={nutritionist.fullName}
            onClick={() => navigate('/nutritionist/profile')}
            aria-label="Your profile"
          >
            <Avatar
              user={nutritionist.user}
              size={32}
              style={{
                width: "100%",
                height: "100%",
                fontSize: 11,
                fontWeight: 700,
                color: "#fff",
              }}
            />
          </div>
        </header>

        <div className="content">
          <div className="nl-wrap">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function NutritionistLayout() {
  return (
    <ToastProvider>
      <NutritionistLayoutInner />
    </ToastProvider>
  );
}