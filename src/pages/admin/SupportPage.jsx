import { useEffect, useState } from "react";
import { T, css, SearchBar, Select, PageHead, EmptyState, Pagination } from "./adminUtils";
import { apiFetch } from "../../services/adminApi";
import useDebouncedValue from "../../hooks/useDebouncedValue";

const STATUS_OPTIONS = ["All Status", "Open", "Resolved"];

export default function SupportPage() {
  const [tickets, setTickets] = useState([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchTickets = () => {
    const params = new URLSearchParams({
      search: debouncedSearch,
      status: statusFilter,
      page: String(currentPage),
      limit: "10",
    });
    apiFetch(`/tickets?${params.toString()}`)
      .then((data) => {
        setTickets(data.tickets || []);
        setTotalPages(data.totalPages || 1);
      })
      .catch(() => {
        setTickets([]);
      });
  };

  useEffect(() => {
    fetchTickets();
  }, [debouncedSearch, statusFilter, currentPage]);

  const updateStatus = (ticketId, status) => {
    apiFetch(`/tickets/${ticketId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    })
      .then(fetchTickets)
      .catch(() => {});
  };

  return (
    <>
      <PageHead title="Support Tickets" sub="View submitted support tickets and update status." />

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, email, or message..." />
        <Select value={statusFilter} onChange={setStatusFilter} opts={STATUS_OPTIONS} />
      </div>

      {tickets.length === 0 ? (
        <EmptyState title="No tickets found" />
      ) : (
        <>
          <div style={css.card}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["ID", "Name", "Email", "Message", "Status", "Created", "Change Status"].map((h) => (
                    <th key={h} style={css.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td style={{ ...css.td, fontFamily: "monospace", color: T.gray }}>{ticket.id}</td>
                    <td style={{ ...css.td, color: T.text, fontWeight: 600 }}>{ticket.name}</td>
                    <td style={{ ...css.td, color: T.textMd }}>{ticket.email || "-"}</td>
                    <td style={{ ...css.td, color: T.textMd, maxWidth: 420 }}>
                      <div style={{ whiteSpace: "normal", lineHeight: 1.5 }}>{ticket.message || "-"}</div>
                    </td>
                    <td style={css.td}>
                      <span style={css.badge(ticket.status === "Resolved" ? T.greenLight : T.amberLt, ticket.status === "Resolved" ? T.greenTx : T.amberTx)}>
                        {ticket.status}
                      </span>
                    </td>
                    <td style={{ ...css.td, color: T.gray }}>{ticket.date}</td>
                    <td style={css.td}>
                      <Select value={ticket.status} onChange={(value) => updateStatus(ticket.id, value)} opts={["Open", "Resolved"]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      )}
    </>
  );
}
