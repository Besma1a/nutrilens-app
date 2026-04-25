import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ErrorBoundary from '../ErrorBoundary';
import { ToastProvider } from './Toast';
import UserSidebar from './UserSidebar';
import { useToast } from './Toast';
import { notificationsApi } from '../../services/api';

/* ── Page metadata ── */
const META = {
  '/user/dashboard':    { title: 'Dashboard',              sub: 'Monday, March 30, 2026 · Week 13' },
  '/user/tracker':      { title: 'Calorie Tracker',        sub: 'Unlimited AI scans · March 30' },
  '/user/meal-plan':    { title: 'Meal Plan',              sub: 'Spring 2026 · 1,800 kcal/day' },
  '/user/consultation': { title: 'Consultations',          sub: 'Manage your sessions' },
  '/user/messages':     { title: 'Messages',               sub: 'Chat with your care team' },
  '/user/subscribe':    { title: 'Billing & Subscription', sub: 'Manage your plan' },
  '/user/profile':      { title: 'Health Profile',         sub: 'Your personal health data' },
  '/user/progress':     { title: 'Progress',               sub: 'Jan 3, 2026 – Present · Week 11' },
  '/user/notifications':{ title: 'Notifications',          sub: 'Alerts and updates' },
};

const NOTIF_POLL_MS = 60_000;

function UserLayout() {
  const { user, isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [unreadCount, setUnreadCount] = useState(0);
  const notifPollRef = useRef(null);

  // Redirect unauthenticated users to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect users to health setup if onboarding is not complete
  if (!user?.onboardingComplete && location.pathname !== '/user/subscribe') {
    return <Navigate to="/health-setup" replace />;
  }

  const { title, sub } = META[location.pathname] || { title: 'NutriLens', sub: '' };

  const handleSearch = (e) => {
    if (e.key === 'Enter' && search.trim()) {
      toast({ message: 'Search functionality coming soon! 🔍', type: 'info' });
    }
  };

  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await notificationsApi.list({ unreadOnly: true });
      setUnreadCount(Array.isArray(data) ? data.length : 0);
    } catch {
      // Keep UI stable when notifications endpoint is temporarily unavailable.
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    notifPollRef.current = setInterval(fetchUnreadCount, NOTIF_POLL_MS);
    return () => {
      if (notifPollRef.current) clearInterval(notifPollRef.current);
    };
  }, [fetchUnreadCount]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surf)' }}>

      <UserSidebar user={user} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="main">

        {/* Header — hamburger lives here, first child in the flex row */}
        <header className="hdr">

          {/* Hamburger — only visible on mobile via CSS */}
          <button
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 18, height: 18 }}>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          <div className="hdr-title">
            <div className="hdr-page">{title}</div>
            {sub && <div className="hdr-sub">{sub}</div>}
          </div>

          <div className="hdr-search">
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              placeholder="Search foods, meals…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleSearch}
              aria-label="Search"
            />
          </div>

          <button
            className="hdr-btn"
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} new` : ''}`}
            onClick={() => navigate('/user/notifications')}
          >
            <svg viewBox="0 0 24 24">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && <span className="hdr-notif-dot" aria-hidden />}
          </button>

          <div
            className="hdr-av"
            role="button" tabIndex={0}
            title={user.name}
            onClick={() => navigate('/user/profile')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/user/profile');
              }
            }}
            aria-label="Your profile"
          >
            {user.avatar}
          </div>

        </header>

        <div className="content">
          <div className="user-page-wrap">
            <ErrorBoundary>
              <Suspense fallback={<div className="user-page-loading" aria-busy="true" aria-live="polite">Loading…</div>}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function UserLayoutWithToast() {
  return (
    <ToastProvider>
      <UserLayout />
    </ToastProvider>
  );
}