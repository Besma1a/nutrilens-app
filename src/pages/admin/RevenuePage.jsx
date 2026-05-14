import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { T, css, IBtn, StatusBadge, PageHead, Drawer, DrawerField, EmptyState, SuccessMsg, Pagination } from "./adminUtils";
import { apiFetch } from "../../services/adminApi";

export default function RevenuePage() {
  const [selected, setSelected] = useState(null);
  const [flagged, setFlagged] = useState([]);
  const [successMsg, setSuccessMsg] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [statsPayload, setStatsPayload] = useState({ monthlyRevenue: [], revenueByPlan: [], mrr: 0, newRevenue: 0, churn: 0, refundsTotal: 0 });
  const [transactions, setTransactions] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const isRealTransactionId = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id || ""));

  const stats = [
    { label: "MRR", value: `$${Math.round(statsPayload.mrr).toLocaleString()}`, delta: "", up: true },
    { label: "New Revenue", value: `$${Math.round(statsPayload.newRevenue).toLocaleString()}`, delta: "", up: true },
    { label: "Churn (MoM)", value: `${statsPayload.churn}%`, delta: "", up: true },
    { label: "Refunds Issued", value: `$${Math.round(statsPayload.refundsTotal).toLocaleString()}`, delta: "", up: false },
  ];

  useEffect(() => {
    apiFetch("/revenue/stats").then(setStatsPayload).catch(() => {});
  }, []);
  useEffect(() => {
    apiFetch(`/transactions?page=${currentPage}&limit=8`).then((data) => {
      setTransactions(data.transactions || []);
      setTotalPages(data.totalPages || 1);
    }).catch(() => {});
  }, [currentPage]);

  const exportCSV = () => {
    const headers = ["User", "Plan", "Amount", "Date", "Method", "Status", "Transaction ID"];
    const rows = transactions.map((t) => [t.user, t.plan, t.amount, t.date, t.method, t.status, t.id]);
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transactions.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSuccessMsg("CSV exported");
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  return (
    <>
      <PageHead title="Revenue & Payments" sub="Track MRR, cash flow, refunds, and transaction history." />
      <SuccessMsg message={successMsg} show={!!successMsg} />

      {transactions.filter(t => t.status === "Failed").length > 0 && (
        <div style={{ background: T.redLt, border: `1px solid ${T.red}`, borderRadius: 10, padding: "10px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="16" height="16" fill="none" stroke={T.red} strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.redTx }}>
            {transactions.filter(t => t.status === "Failed").length} failed payment{transactions.filter(t => t.status === "Failed").length > 1 ? "s" : ""} require attention
          </span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ fontSize: 12, color: T.gray, marginBottom: 5 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: T.text }}>{s.value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4, color: s.up ? T.greenTx : T.red }}>
              {s.delta}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 20, marginBottom: 20 }}>
        {/* Monthly Revenue */}
        <div style={css.cardPad}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Monthly Revenue</span>
      
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={statsPayload.monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: T.grayMd }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: T.grayMd }} tickFormatter={v => `$${Math.round(v / 1000)}k`} />
              <Tooltip formatter={v => [`$${v.toLocaleString()}`, "Revenue"]} contentStyle={{ borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 12 }} />
              <Bar dataKey="r" fill={T.green} radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Plan */}
        <div style={css.cardPad}>
          <div style={{ marginBottom: 18 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Revenue by Plan</span>
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <div style={{ width: 150, height: 150 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statsPayload.revenueByPlan} innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={2}>
                    {statsPayload.revenueByPlan.map((d, i) => (
                      <Cell key={d.name} fill={[T.gray, T.green, T.blue, T.purple][i % 4]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
            {statsPayload.revenueByPlan.map((d, i) => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.gray }}>
                <span style={{ width: 9, height: 9, background: [T.gray, T.green, T.blue, T.purple][i % 4], borderRadius: 2, display: "inline-block" }} />
                {d.name} — ${d.value.toLocaleString()}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div style={{ ...css.cardPad, overflowX: "auto", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Recent Transactions</span>
          <button style={css.btn(T.white, T.text, `1px solid ${T.border}`)} onClick={exportCSV}>
            Export CSV
          </button>
        </div>
        {transactions.length === 0 ? (
          <EmptyState title="No transactions" />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["User", "Plan", "Amount", "Date", "Method", "Status", "Actions"].map(h => <th key={h} style={css.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {transactions.map((t, i) => (
                <tr
                  key={i}
                  style={{ cursor: "pointer", background: t.status === "Failed" ? "#fff8f8" : "transparent" }}
                  onClick={() => setSelected({ ...t, txnId: t.id, index: i })}
                >
                  <td style={{ ...css.td, fontWeight: 600, color: T.text }}>{t.user}</td>
                  <td style={css.td}>
                    <span style={css.badge(T.greenLight, T.greenTx)}>{t.plan}</span>
                  </td>
                  <td style={{ ...css.td, fontWeight: 700, color: T.text }}>{t.amount}</td>
                  <td style={{ ...css.td, color: T.gray }}>{t.date}</td>
                  <td style={{ ...css.td, color: T.gray }}>{t.method}</td>
                  <td style={css.td}>
                    <StatusBadge status={t.status} />
                  </td>
                  <td style={css.td} onClick={e => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 2 }}>
                      <IBtn title="View invoice" onClick={() => setSelected({ ...t, txnId: t.id, index: i })}>
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </IBtn>
                      <IBtn title="Flag" onClick={() => setFlagged(f => (f.includes(i) ? f.filter(x => x !== i) : [...f, i]))}>
                        <svg width="14" height="14" fill={flagged.includes(i) ? T.amber : "none"} stroke={flagged.includes(i) ? T.amber : "currentColor"} strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                          <line x1="4" y1="22" x2="4" y2="15" />
                        </svg>
                      </IBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Transaction Details">
        {selected && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <StatusBadge status={selected.status} />
              {selected.refundStatus && <StatusBadge status={selected.refundStatus} />}
            </div>
            <DrawerField label="User" value={selected.user} />
            <DrawerField label="Plan" value={selected.plan} />
            <DrawerField label="Amount" value={selected.amount} />
            <DrawerField label="Date" value={selected.date} />
            <DrawerField label="Payment Method" value="No payment gateway" />
            <DrawerField label="Transaction ID" value={selected.txnId} />
            <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
              {selected.status === "Paid" && isRealTransactionId(selected.id) && (
                <button style={css.btn(T.redLt, T.redTx)} onClick={() => apiFetch(`/transactions/${selected.id}/refund`, { method: "POST" }).then(() => { setSuccessMsg("Refund issued"); setTimeout(() => setSuccessMsg(""), 1500); setSelected(null); })}>
                  Issue Refund
                </button>
              )}
            </div>
          </>
        )}
      </Drawer>
    </>
  );
}