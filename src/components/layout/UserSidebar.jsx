import { NavLink, useNavigate } from 'react-router-dom';
import { useToast } from './Toast';

function Icon({ children, className = 'si' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const ICONS = {
  Dashboard:    <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  Tracker:      <><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9"/></>,
  Progress:     <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,
  Messages:     <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,
  MealPlan:     <><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></>,
  Consultation: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  Billing:      <><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></>,
  Star:         <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></>,
  Chevron:      <polyline points="9 18 15 12 9 6"/>,
  Lock:         <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
};

const SECTIONS = [
  {
    label: 'Overview',
    items: [
      { path: '/user/dashboard', icon: 'Dashboard', label: 'Dashboard'       },
      { path: '/user/tracker',   icon: 'Tracker',   label: 'Calorie Tracker' },
      { path: '/user/progress',  icon: 'Progress',  label: 'Progress'        },
    ],
  },
  {
    label: 'Care',
    items: [
      { path: '/user/consultation', icon: 'Consultation', label: 'Consultations', premium: true, badge: 2 },
      { path: '/user/messages',     icon: 'Messages',     label: 'Messages',      premium: true, badge: 3 },
      { path: '/user/meal-plan',    icon: 'MealPlan',     label: 'Meal Plan',     premium: true },
    ],
  },
  {
    label: 'Account',
    items: [
      { path: '/user/subscribe', icon: 'Billing', label: 'Billing' },
    ],
  },
];

export default function UserSidebar({ user, open, onClose }) {
  const navigate = useNavigate();
  const toast = useToast();

  return (
    <>
      <aside className={`sb${open ? ' open' : ''}`}>

        {/* Brand */}
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
              <path d="M12 3c.5 5-3 8-6 9 1.5 3 4 5 6 6 2-1 4.5-3 6-6-3-1-6.5-4-6-9z"/>
            </svg>
          </div>
          <div className="sb-wordmark">Nutri<span>Lens</span></div>
        </div>

        {/* Plan status */}
        {user.isSubscribed ? (
          <div className="sb-plan">
            <div className="sb-plan-ic">
              <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, fill: 'white' }}>
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
              </svg>
            </div>
            <div>
              <div className="sb-plan-name">Premium Plan</div>
              <div className="sb-plan-days">Active · Renews Apr 13</div>
            </div>
          </div>
        ) : (
          <div
            className="sb-free-pill"
            role="button" tabIndex={0}
            onClick={() => { navigate('/user/subscribe'); onClose(); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/user/subscribe');
                onClose();
              }
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '.5px', lineHeight: 1 }}>Free Plan</div>
            <div style={{ fontSize: 10, color: '#92400e', marginTop: 3, lineHeight: 1.3 }}>Upgrade to unlock all features →</div>
          </div>
        )}

        {/* Nav */}
        <nav className="sb-nav">
          {SECTIONS.map(section => (
            <div key={section.label}>
              <div className="sb-section">{section.label}</div>
              {section.items.map(item => {
                const isLocked = item.premium && !user.isSubscribed;
                const to = isLocked ? '/user/subscribe' : item.path;

                return (
                  <NavLink
                    key={item.path}
                    to={to}
                    onClick={() => {
                      if (isLocked) {
                        toast({ message: `Upgrade to Premium to access ${item.label}! ✨`, type: 'info' });
                      }
                      onClose();
                    }}
                    className={({ isActive }) =>
                      `sb-item${isActive && !isLocked ? ' active' : ''}`
                    }
                  >
                    <Icon>{ICONS[item.icon]}</Icon>
                    <span style={{ flex: 1, lineHeight: 1.2 }}>{item.label}</span>

                    {item.badge && user.isSubscribed && (
                      <span className="sb-badge">{item.badge}</span>
                    )}
                    {isLocked && (
                      <svg viewBox="0 0 24 24" className="si" style={{ width: 11, height: 11, color: 'var(--ink-5)', fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                        {ICONS.Lock}
                      </svg>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User footer — clicking avatar goes to profile */}
        <div className="sb-footer">
          <div
            className="sb-user"
            role="button" tabIndex={0}
            onClick={() => { navigate('/user/profile'); onClose(); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/user/profile');
                onClose();
              }
            }}
            title="View Health Profile"
          >
            <div className="sb-av">{user.avatar}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sb-user-name">{user.name}</div>
              <div className="sb-user-plan">
                {user.isSubscribed ? 'Premium · View Profile →' : 'Free plan · View Profile →'}
              </div>
            </div>
            <svg viewBox="0 0 24 24" className="si" style={{ width: 13, height: 13, color: 'var(--ink-5)', fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
              {ICONS.Chevron}
            </svg>
          </div>
        </div>
      </aside>

      {open && (
        <div className="sidebar-backdrop" onClick={onClose} />
      )}
    </>
  );
}