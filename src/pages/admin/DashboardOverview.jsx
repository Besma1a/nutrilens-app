import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useEffect, useState } from "react";
import { T, css, KpiCard, StatusBadge } from "./adminUtils";
import { apiFetch } from "../../services/adminApi";

export default function DashboardOverview() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalNutritionists: 0,
    activeSubscriptions: 0,
    openTickets: 0,
    userGrowth: [],
    subscriptionDistribution: [],
    recentActivity: [],
  });

  useEffect(() => {
    apiFetch("/stats").then(setStats).catch(() => {});
  }, []);
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const kpis = [
    {
      label: "Total Users",
      value: stats.totalUsers.toLocaleString(),
      icon: (
        <>
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </>
      ),
    },
    {
      label: "Nutritionists",
      value: stats.totalNutritionists.toLocaleString(),
      icon: (
        <>
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
          <line x1="12" y1="11" x2="12" y2="15" />
          <line x1="10" y1="13" x2="14" y2="13" />
        </>
      ),
    },
    {
      label: "Active Subs",
      value: stats.activeSubscriptions.toLocaleString(),
      icon: (
        <>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </>
      ),
    },
    {
      label: "Open Tickets",
      value: stats.openTickets.toLocaleString(),
      icon: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />,
    },
  ];

  return (
    <>
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
            {greeting()}, Administrator
          </div>
          <div style={{
            fontSize: 15,
            color: 'rgba(43,87,38,0.72)',
            marginTop: 6,
          }}>
            
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 24 }}>
        {kpis.map(k => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 20, marginBottom: 20 }}>
        {/* User Growth */}
        <div style={css.cardPad}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>User Growth</span>
            <select style={{ border: `1px solid ${T.border}`, borderRadius: 7, padding: "5px 10px", fontSize: 12, color: T.text, background: T.white, outline: "none" }}>
              <option>Last 6 months</option>
              <option>Last year</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={stats.userGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: T.grayMd }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: T.grayMd }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 12 }} />
              <Line type="monotone" dataKey="u" stroke={T.green} strokeWidth={2.5} dot={{ fill: T.green, r: 3.5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Subscription Distribution */}
        <div style={css.cardPad}>
          <div style={{ marginBottom: 18 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Subscription Distribution</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <div style={{ width: 130, height: 130, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.subscriptionDistribution} innerRadius={44} outerRadius={62} dataKey="value" paddingAngle={2}>
                    {stats.subscriptionDistribution.map((d, i) => (
                      <Cell key={d.name} fill={[T.gray, T.green, T.blue, T.purple][i % 4]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              {stats.subscriptionDistribution.map((d, i) => (
                <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: [T.gray, T.green, T.blue, T.purple][i % 4], display: "inline-block", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: T.textMd }}>
                    {d.name} — <strong style={{ color: T.text }}>{d.value}</strong>
                  </span>
                </div>
              ))}
              <div style={{ fontSize: 12, color: T.gray, marginTop: 4 }}>Total: {stats.activeSubscriptions} subscribers</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ ...css.cardPad, overflowX: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Recent Activity</span>
          
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["User", "Action", "Time", "Status"].map(h => <th key={h} style={css.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {stats.recentActivity.map((r, i) => (
              <tr key={i}>
                <td style={{ ...css.td, fontWeight: 600, color: T.text }}>{r.name}</td>
                <td style={{ ...css.td, color: T.textMd }}>{r.action}</td>
                <td style={{ ...css.td, color: T.gray }}>{r.time}</td>
                <td style={css.td}>
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}