import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getAPIBaseUrl, getToken } from "../../services/api.js";
import {
  CalendarDays, Users, FileText, MessageSquare,
  Utensils, TrendingUp, Camera, AlertTriangle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";

// ─────────────────────────────────────────────────────────────
// Dashboard API — Django `/api/v1/dashboard/stats/` (Token auth)
// ─────────────────────────────────────────────────────────────

function dashboardAuthHeaders() {
  const token = getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Token ${token}`;
  return headers;
}

async function fetchDashboardStats() {
  const token = getToken();
  if (!token) {
    throw new Error("Sign in to load your dashboard.");
  }
  const base = getAPIBaseUrl();
  const res = await fetch(`${base}/dashboard/stats/`, {
    headers: dashboardAuthHeaders(),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    const msg =
      data && typeof data === "object" && data.detail
        ? String(data.detail)
        : `Could not load dashboard (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

async function dashboardGetJson(relPath) {
  const token = getToken();
  if (!token) {
    throw new Error("Sign in to load your dashboard.");
  }
  const base = getAPIBaseUrl();
  const path = relPath.startsWith("/") ? relPath.slice(1) : relPath;
  const url = `${base}/dashboard/${path}`;
  const res = await fetch(url, { headers: dashboardAuthHeaders() });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    const msg =
      data && typeof data === "object" && data.detail
        ? String(data.detail)
        : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return Array.isArray(data) ? data : data ?? [];
}

function mapStatsCards(raw) {
  return {
    upcomingSessions: {
      value: raw.upcomingSessions ?? 0,
      meta: "Pending & confirmed",
    },
    totalClients: {
      value: raw.totalClients ?? 0,
      meta: "Patients assigned to you",
    },
    activeMealPlans: {
      value: raw.activeMealPlans ?? 0,
      meta: "Active diet plans",
    },
    newClientsThisMonth: {
      value: raw.newClientsThisMonth ?? 0,
      meta: "Joined this month",
    },
  };
}

const APPT_ROW_COLORS = ["#4ade80", "#60a5fa", "#f97316", "#a78bfa", "#f43f5e"];

function mapNextSessionsToAppointments(nextSessions) {
  const rows = nextSessions || [];
  return rows.map((row, i) => {
    const name = row.clientName || "Client";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const initials =
      parts.length >= 2
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : name.slice(0, 2).toUpperCase();
    const [hh = "0", mm = "0"] = String(row.time || "0:0").split(":");
    const d = new Date();
    d.setHours(parseInt(hh, 10), parseInt(mm, 10), 0, 0);
    const timeLabel = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    return {
      id: `${row.date}-${row.time}-${i}`,
      time: timeLabel,
      initials,
      bg: APPT_ROW_COLORS[i % APPT_ROW_COLORS.length],
      patientName: name,
      type: "Consultation",
      date: row.date,
      duration: 30,
      badge: "green",
      label: "Scheduled",
    };
  });
}

// ─────────────────────────────────────────────────────────────
// 4. DATA HOOK (unchanged)
// ─────────────────────────────────────────────────────────────
function useDashboard() {
  const initial = { data: null, loading: true, error: null };
  const listInitial = { data: [], loading: true, error: null };
  const [stats, setStats] = useState(initial);
  const [appointments, setAppointments] = useState(initial);
  const [weeklyCalories, setWeeklyCalories] = useState(listInitial);
  const [activityFeed, setActivityFeed] = useState(listInitial);

  const fetchAll = useCallback(() => {
    setStats({ data: null, loading: true, error: null });
    setAppointments({ data: null, loading: true, error: null });
    setWeeklyCalories({ data: [], loading: true, error: null });
    setActivityFeed({ data: [], loading: true, error: null });

    const msg = (e) => (e instanceof Error ? e.message : "Something went wrong.");

    Promise.allSettled([
      fetchDashboardStats(),
      dashboardGetJson("weekly-calories/"),
      dashboardGetJson("activity/"),
    ]).then((results) => {
      const [rStats, rWeek, rAct] = results;

      if (rStats.status === "fulfilled") {
        const raw = rStats.value;
        setStats({ data: mapStatsCards(raw), loading: false, error: null });
        setAppointments({
          data: mapNextSessionsToAppointments(raw.nextSessions),
          loading: false,
          error: null,
        });
      } else {
        const m = msg(rStats.reason);
        setStats({ data: null, loading: false, error: m });
        setAppointments({ data: null, loading: false, error: m });
      }

      if (rWeek.status === "fulfilled") {
        setWeeklyCalories({ data: rWeek.value, loading: false, error: null });
      } else {
        setWeeklyCalories({ data: [], loading: false, error: msg(rWeek.reason) });
      }

      if (rAct.status === "fulfilled") {
        setActivityFeed({ data: rAct.value, loading: false, error: null });
      } else {
        setActivityFeed({ data: [], loading: false, error: msg(rAct.reason) });
      }
    });
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { stats, appointments, weeklyCalories, activityFeed, refetch: fetchAll };
}

// ─────────────────────────────────────────────────────────────
// 5. DESIGN TOKENS + CSS (unchanged)
// ─────────────────────────────────────────────────────────────
const css = `
  .dash-grid-4 {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
  .dash-grid-2-1 {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 20px;
  }
  @media (max-width: 1100px) {
    .dash-grid-4 { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 900px) {
    .dash-grid-2-1 { grid-template-columns: 1fr; }
  }
  @media (max-width: 600px) {
    .dash-grid-4 { grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .dash-stat-value { font-size: 26px !important; }
    .dash-appt-time  { display: none; }
  }
  @media (max-width: 420px) {
    .dash-grid-4 { grid-template-columns: 1fr; }
  }

  .dash-skeleton {
    background: linear-gradient(90deg, var(--gray-100) 25%, var(--gray-50, #f9fafb) 50%, var(--gray-100) 75%);
    background-size: 200% 100%;
    animation: dash-shimmer 1.4s infinite;
    border-radius: 6px;
  }
  @keyframes dash-shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .dash-badge-green { background: var(--green-light); color: var(--green-dark); }
  .dash-badge-blue  { background: var(--blue-light);  color: var(--blue-dark);  }
  .dash-badge-amber { background: var(--amber-light); color: var(--amber-dark); }
  .dash-badge-gray  { background: var(--gray-100);    color: var(--gray-500);   }
  .dash-badge-red   { background: var(--red-light);   color: var(--red-dark);   }
`;

// ─────────────────────────────────────────────────────────────
// 6–9. SMALL COMPONENTS, STAT CARDS, APPOINTMENTS, ALERTS (unchanged)
// ─────────────────────────────────────────────────────────────
const card = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  padding: "20px",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

function Skeleton({ w = "100%", h = 18, mb = 0 }) {
  return <div className="dash-skeleton" style={{ width: w, height: h, marginBottom: mb }} />;
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div style={{
      background: "var(--red-light)", border: "1px solid #f8d7da",
      borderRadius: 10, padding: "12px 16px", fontSize: 13,
      color: "var(--red-dark)", display: "flex", alignItems: "center",
      justifyContent: "space-between", gap: 12,
    }}>
      <span>⚠ {message}</span>
      {onRetry && (
        <button onClick={onRetry} style={{
          background: "none", border: "1px solid var(--red-dark)", borderRadius: 6,
          padding: "3px 10px", fontSize: 12, color: "var(--red-dark)", cursor: "pointer",
        }}>
          Retry
        </button>
      )}
    </div>
  );
}

function Badge({ type, children }) {
  return (
    <span className={`dash-badge-${type}`} style={{
      display: "inline-flex", alignItems: "center",
      padding: "4px 10px", borderRadius: 20,
      fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

const STAT_DEFS = [
  { key: "upcomingSessions", color: "#2B5726", Icon: CalendarDays, label: "Upcoming sessions" },
  { key: "totalClients",     color: "#DEE660",  Icon: Users,         label: "Total clients" },
  { key: "activeMealPlans",  color: "#F19335", Icon: FileText,      label: "Active meal plans" },
  { key: "newClientsThisMonth", color: "#A50C05", Icon: MessageSquare, label: "New clients (month)" },
];

function StatCards({ state }) {
  return (
    <div className="dash-grid-4">
      {STAT_DEFS.map(({ key, color, Icon, label }) => {
        const Ico = Icon;
        return (
        <div key={key} style={{
          ...card,
          position: "relative", overflow: "hidden",
          borderTop: `4px solid ${color}`, padding: "22px 20px",
        }}>
          <div style={{
            position: "absolute", right: 20, top: 20,
            width: 42, height: 42, borderRadius: 12,
            background: color + "18",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Ico size={20} color={color} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--gray-500)", marginBottom: 10 }}>{label}</div>

          {state.loading ? (
            <>
              <Skeleton w={60} h={36} mb={10} />
              <Skeleton w={140} h={14} />
            </>
          ) : state.error ? (
            <div style={{ fontSize: 13, color: "var(--red-dark)" }}>—</div>
          ) : (
            <>
              <div className="dash-stat-value" style={{ fontSize: 32, fontWeight: 700, color: "var(--gray-900)", letterSpacing: "-1px" }}>
                {state.data?.[key]?.value ?? "—"}
              </div>
              <div style={{ fontSize: 13, color: "var(--gray-500)", marginTop: 10 }}>
                {state.data?.[key]?.meta}
              </div>
            </>
          )}
        </div>
        );
      })}
    </div>
  );
}

function AppointmentsList({ state, onNavigate }) {
  return (
    <div style={card}>
      <div style={{
        fontSize: 15, fontWeight: 600, color: "var(--gray-700)",
        marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        Upcoming sessions
        <button onClick={onNavigate} style={{
          fontSize: 13.5, color: "#2B5726", background: "none",
          border: "none", fontWeight: 600, cursor: "pointer",
          padding: "4px 8px", borderRadius: 6,
        }}>
          View full calendar →
        </button>
      </div>

      {state.error && <ErrorBanner message={state.error} />}

      {state.loading
        ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "14px 0", borderBottom: "1px solid var(--border-light)", alignItems: "center" }}>
              <Skeleton w={72} h={32} />
              <Skeleton w={36} h={36} />
              <div style={{ flex: 1 }}>
                <Skeleton w="55%" h={14} mb={6} />
                <Skeleton w="40%" h={12} />
              </div>
              <Skeleton w={64} h={24} />
            </div>
          ))
        : !state.data?.length ? (
            <div style={{ fontSize: 14, color: "var(--gray-500)", padding: "8px 0" }}>
              No upcoming sessions.
            </div>
          )
        : state.data?.map((a, i) => (
            <div key={a.id} style={{
              display: "flex", alignItems: "center", padding: "14px 0",
              borderBottom: i < state.data.length - 1 ? "1px solid var(--border-light)" : "none",
              gap: 8, flexWrap: "wrap",
            }}>
              <span className="dash-appt-time" style={{
                fontSize: 13.5, fontWeight: 700, color: "#2B5726",
                background: "#DEE66033", padding: "6px 10px",
                borderRadius: 8, whiteSpace: "nowrap", flexShrink: 0,
              }}>
                {a.time}
              </span>

              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: a.bg, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 12.5, fontWeight: 700,
                color: "white", flexShrink: 0,
              }}>
                {a.initials}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--gray-800)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {a.patientName}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--gray-500)" }}>
                  {a.date ? `${a.date} · ` : ""}{a.type} • {a.duration} min
                </div>
              </div>

              <Badge type={a.badge}>{a.label}</Badge>
            </div>
          ))
      }
    </div>
  );
}

function WeeklyCalorieCard({ state }) {
  const rows = state.data || [];
  const targetLine = rows.length ? rows[0].target ?? 1800 : 1800;
  const maxIntake = rows.length ? Math.max(...rows.map((r) => r.intake || 0), targetLine) : targetLine;
  const yMax = Math.max(1200, Math.ceil(maxIntake * 1.15 / 100) * 100);

  return (
    <div style={card}>
      <div style={{
        fontSize: 13, fontWeight: 600, color: "var(--gray-600)", marginBottom: 10,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 8,
      }}>
        Weekly calories (cohort)
        <div style={{ display: "flex", gap: 16, fontSize: 12.5, fontWeight: 500, color: "var(--gray-500)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: "#2B5726", display: "inline-block" }} /> Under target
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: "#A50C05", display: "inline-block" }} /> Above target
          </span>
        </div>
      </div>

      {state.loading ? (
        <div style={{ height: 210, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Skeleton w="100%" h={180} />
        </div>
      ) : state.error ? (
        <ErrorBanner message={state.error} />
      ) : !rows.length ? (
        <div
          style={{
            height: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            color: "var(--gray-500)",
            textAlign: "center",
            padding: "0 12px",
          }}
        >
          No cohort meal data for the last 7 days. Assign patients and have them log meals to see trends.
        </div>
      ) : (
        <div style={{ height: 240, width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="2 2" stroke="#FEF8E040" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#2B5726" }} />
              <YAxis
                domain={[0, yMax]}
                tick={{ fontSize: 11, fill: "#2B5726" }}
                width={48}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              />
              <ReferenceLine
                y={targetLine}
                stroke="#DEE660"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{
                  value: `Avg target · ${targetLine} kcal`,
                  position: "topRight",
                  fill: "#2B5726",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
              <Bar dataKey="intake" radius={[6, 6, 0, 0]}>
                {rows.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={(entry.intake || 0) > (entry.target || targetLine) ? "#A50C05" : "#2B5726"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

const ICON_MAP = {
  utensils: Utensils,
  trending: TrendingUp,
  camera: Camera,
  alert: AlertTriangle,
};

function ActivityFeed({ state }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--gray-700)", marginBottom: 16 }}>
        Recent activity
      </div>

      {state.error && <ErrorBanner message={state.error} />}

      {state.loading
        ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "13px 0", borderBottom: "1px solid var(--border-light)" }}>
              <Skeleton w={34} h={34} />
              <div style={{ flex: 1 }}>
                <Skeleton w="75%" h={13} mb={6} />
                <Skeleton w="30%" h={11} />
              </div>
            </div>
          ))
        : !state.data?.length ? (
            <div style={{ fontSize: 14, color: "var(--gray-500)" }}>
              No recent activity from your patients yet.
            </div>
          )
        : state.data?.map((f, i) => {
            const Icon = ICON_MAP[f.icon] ?? Utensils;
            return (
              <div key={f.id} style={{
                display: "flex", gap: 12, padding: "13px 0",
                borderBottom: i < state.data.length - 1 ? "1px solid var(--border-light)" : "none",
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: f.bg, display: "flex", alignItems: "center",
                  justifyContent: "center", color: "var(--gray-600)", flexShrink: 0,
                }}>
                  <Icon size={15} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.2, color: "var(--gray-700)", lineHeight: 1.55 }}>{f.text}</div>
                  <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 4 }}>{f.time}</div>
                </div>
              </div>
            );
          })}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { stats, appointments, weeklyCalories, activityFeed } = useDashboard();

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <>
      <style>{css}</style>

      {/* Hero Section */}
      <div style={{
        fontFamily: "'Inter', sans-serif",
        marginBottom: 32,
        paddingTop: 0,
      }}>
        <div>
          <div style={{
            fontSize: 28,
            fontWeight: 800,
            color: '#000',
            letterSpacing: '-0.6px',
            margin: 0,
            fontFamily: "'Outfit', sans-serif",
          }}>
            {greeting()}, Nutritionist
          </div>
          <div style={{
            fontSize: 15,
            color: 'rgba(43,87,38,0.72)',
            marginTop: 6,
          }}>
            {today} · Your practice overview
          </div>
        </div>
      </div>

      <StatCards state={stats} />

      <div style={{ marginTop: 16 }}>
        <AppointmentsList state={appointments} onNavigate={() => navigate("/nutritionist/calendar")} />
      </div>

      <div className="dash-grid-2-1" style={{ marginTop: 16 }}>
        <WeeklyCalorieCard state={weeklyCalories} />
        <ActivityFeed state={activityFeed} />
      </div>
    </>
  );
}