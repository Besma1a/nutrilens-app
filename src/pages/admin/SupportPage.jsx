import { useMemo, useState } from "react";
import { T, css, IBtn, StatusBadge, SearchBar, Select, PageHead, Drawer, EmptyState, SuccessMsg, Pagination } from "./adminUtils";

const TICKETS_DATA = [
  {
    id: "T-001",
    user: "Sarah Johnson",
    subject: "Cannot access meal plans",
    priority: "High",
    date: "Mar 1",
    status: "Open",
    assigned: null,
    messages: [{ from: "Sarah Johnson", role: "user", text: "I can't see my meal plans anymore.", time: "2h ago" }],
  },
  {
    id: "T-002",
    user: "Michael Chen",
    subject: "Billing inquiry",
    priority: "Medium",
    date: "Mar 1",
    status: "In Progress",
    assigned: "Admin",
    messages: [
      { from: "Michael Chen", role: "user", text: "I was charged twice for February.", time: "4h ago" },
      { from: "Admin", role: "admin", text: "Looking into this now.", time: "3h ago" },
    ],
  },
  {
    id: "T-003",
    user: "Emily Davis",
    subject: "Schedule consultation",
    priority: "Low",
    date: "Feb 29",
    status: "Waiting",
    assigned: "Dr. Kim",
    messages: [{ from: "Emily Davis", role: "user", text: "I need to reschedule my session.", time: "5h ago" }],
  },
  {
    id: "T-004",
    user: "James Wilson",
    subject: "Account verification issue",
    priority: "High",
    date: "Feb 28",
    status: "In Progress",
    assigned: "Dr. Kim",
    messages: [{ from: "James Wilson", role: "user", text: "My account shows as unverified.", time: "1d ago" }],
  },
];

const TICKET_STATUSES = ["Open", "In Progress", "Waiting for User", "Resolved", "Closed"];

export default function SupportPage() {
  const [tickets, setTickets] = useState(TICKETS_DATA);
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("All Status");
  const [priorityF, setPriorityF] = useState("All Priority");
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filtered = useMemo(() => {
    const rows = tickets.filter(t =>
      (t.user.toLowerCase().includes(search.toLowerCase()) || t.subject.toLowerCase().includes(search.toLowerCase())) &&
      (statusF === "All Status" || t.status === statusF) &&
      (priorityF === "All Priority" || t.priority === priorityF)
    );
    const rank = { Open: 0, "In Progress": 1, "Waiting for User": 2, Resolved: 3, Closed: 4 };
    return rows.sort((a, b) => (rank[a.status] ?? 5) - (rank[b.status] ?? 5));
  }, [tickets, search, statusF, priorityF]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedTickets = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const resolve = (id) => {
    setTickets(p => p.map(t => (t.id === id ? { ...t, status: "Resolved" } : t)));
    if (selected?.id === id) setSelected(prev => ({ ...prev, status: "Resolved" }));
    setSuccessMsg("Ticket resolved");
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  const close = (id) => {
    setTickets(p => p.map(t => (t.id === id ? { ...t, status: "Closed" } : t)));
    if (selected?.id === id) setSelected(prev => ({ ...prev, status: "Closed" }));
    setSuccessMsg("Ticket closed");
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  const setStatus = (id, status) => {
    setTickets(p => p.map(t => (t.id === id ? { ...t, status } : t)));
    if (selected?.id === id) setSelected(prev => ({ ...prev, status }));
  };

  const setAssigned = (id, assigned) => {
    const nextAssigned = assigned === "Unassigned" ? null : assigned;
    setTickets(p => p.map(t => (t.id === id ? { ...t, assigned: nextAssigned } : t)));
    if (selected?.id === id) setSelected(prev => ({ ...prev, assigned: nextAssigned }));
  };

  const sendReply = () => {
    if (!selected || !reply.trim()) return;
    const msg = { from: "Admin", role: "admin", text: reply.trim(), time: "Just now" };
    setTickets(p =>
      p.map(t =>
        t.id === selected.id ? { ...t, messages: [...t.messages, msg], status: "In Progress" } : t
      )
    );
    setSelected(prev => ({ ...prev, messages: [...prev.messages, msg], status: "In Progress" }));
    setReply("");
    setSuccessMsg("Reply sent");
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  const unassigned = tickets.filter(t => !t.assigned && t.status !== "Resolved" && t.status !== "Closed").length;

  return (
    <>
      <PageHead title="Support Tickets" sub="Manage incoming support requests across all users." />
      <SuccessMsg message={successMsg} show={!!successMsg} />

      {unassigned > 0 && (
        <div style={{ background: T.amberLt, border: `1px solid ${T.amber}`, borderRadius: 10, padding: "10px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="16" height="16" fill="none" stroke={T.amber} strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.amberTx }}>
            {unassigned} ticket{unassigned > 1 ? "s" : ""} unassigned
          </span>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search tickets..." />
        <Select value={statusF} onChange={setStatusF} opts={["All Status", "Open", "In Progress", "Waiting for User", "Resolved", "Closed"]} />
        <Select value={priorityF} onChange={setPriorityF} opts={["All Priority", "High", "Medium", "Low"]} />
      </div>

      {paginatedTickets.length === 0 ? (
        <EmptyState title="No tickets found" />
      ) : (
        <>
          <div style={css.card}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>{["ID", "User", "Subject", "Priority", "Date", "Status", "Assigned", "Actions"].map(h => <th key={h} style={css.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {paginatedTickets.map(t => (
                  <tr key={t.id} style={{ cursor: "pointer" }} onClick={() => setSelected(t)}>
                    <td style={{ ...css.td, color: T.gray, fontFamily: "monospace", fontSize: 12 }}>{t.id}</td>
                    <td style={{ ...css.td, fontWeight: 600, color: T.text }}>{t.user}</td>
                    <td style={{ ...css.td, color: T.textMd }}>{t.subject}</td>
                    <td style={css.td}>
                      <StatusBadge status={t.priority} />
                    </td>
                    <td style={{ ...css.td, color: T.gray }}>{t.date}</td>
                    <td style={css.td}>
                      <StatusBadge status={t.status} />
                    </td>
                    <td style={css.td}>
                      {t.assigned ? (
                        <span style={{ fontSize: 13, color: T.textMd }}>{t.assigned}</span>
                      ) : (
                        <span style={css.badge(T.amberLt, T.amberTx)}>Unassigned</span>
                      )}
                    </td>
                    <td style={css.td} onClick={e => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 2 }}>
                        <IBtn title="View" onClick={() => setSelected(t)}>
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </IBtn>
                        {t.status !== "Resolved" && t.status !== "Closed" && (
                          <IBtn title="Resolve" onClick={() => resolve(t.id)}>
                            <svg width="14" height="14" fill="none" stroke={T.greenTx} strokeWidth="2" viewBox="0 0 24 24">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </IBtn>
                        )}
                        {t.status !== "Closed" && (
                          <IBtn title="Close" danger onClick={() => close(t.id)}>
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </IBtn>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      )}

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.id} — ${selected.subject}` : ""} width={500}>
        {selected && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <StatusBadge status={selected.priority} />
              <StatusBadge status={selected.status} />
              {!selected.assigned && <span style={css.badge(T.amberLt, T.amberTx)}>Unassigned</span>}
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.gray, textTransform: "uppercase", display: "block", marginBottom: 5 }}>
                Change Status
              </label>
              <Select value={selected.status} onChange={v => setStatus(selected.id, v)} opts={TICKET_STATUSES} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.gray, textTransform: "uppercase", display: "block", marginBottom: 5 }}>
                Assign To
              </label>
              <Select value={selected.assigned || "Unassigned"} onChange={v => setAssigned(selected.id, v)} opts={["Unassigned", "Admin", "Dr. Kim", "Dr. Rodriguez", "Dr. Brown"]} />
            </div>
            <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.gray, textTransform: "uppercase", marginBottom: 12 }}>
                Thread
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 300, overflowY: "auto" }}>
                {selected.messages.map((m, i) => {
                  const isAdmin = m.role === "admin";
                  return (
                    <div
                      key={i}
                      style={{
                        background: isAdmin ? T.bgGreen : "#f0fdf4",
                        borderRadius: 10,
                        padding: "10px 12px",
                        borderLeft: `3px solid ${isAdmin ? T.green : T.greenDark}`,
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: isAdmin ? T.greenDark : T.greenTx, marginBottom: 4 }}>
                        {m.from} <span style={{ fontWeight: 400, color: T.gray }}>· {m.time}</span>
                      </div>
                      <div style={{ fontSize: 13, color: T.textMd, lineHeight: 1.6 }}>{m.text}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.gray, textTransform: "uppercase", display: "block", marginBottom: 5 }}>
                Reply
              </label>
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                rows={3}
                placeholder="Type your reply..."
                style={{
                  width: "100%",
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  padding: "9px 12px",
                  fontSize: 14,
                  color: T.text,
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={css.btn(T.green, "#fff")} onClick={sendReply}>
                Send Reply
              </button>
              <button style={css.btn(T.greenLight, T.greenTx)} onClick={() => resolve(selected.id)}>
                Mark Resolved
              </button>
            </div>
          </>
        )}
      </Drawer>
    </>
  );
}