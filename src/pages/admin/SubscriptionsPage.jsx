import { useEffect, useState } from "react";
import { T, css, StatusBadge, PageHead, EmptyState, SuccessMsg, SearchBar, Select, Pagination } from "./adminUtils";
import { apiFetch } from "../../services/adminApi";
import useDebouncedValue from "../../hooks/useDebouncedValue";

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [plan, setPlan] = useState("All Plans");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [successMsg, setSuccessMsg] = useState("");

  const fetchRows = async () => {
    const params = new URLSearchParams({
      search: debouncedSearch,
      plan,
      page: String(currentPage),
      limit: "10",
    });
    const data = await apiFetch(`/subscriptions?${params.toString()}`);
    setSubscriptions(data.subscriptions || []);
    setTotalPages(data.totalPages || 1);
  };

  useEffect(() => {
    fetchRows().catch(() => {});
  }, [debouncedSearch, plan, currentPage]);

  return (
    <>
      <PageHead title="Subscription Plans & Promotions" sub="Manage pricing, features, and promotional campaigns." />
      <SuccessMsg message={successMsg} show={!!successMsg} />

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search subscriptions..." />
        <Select value={plan} onChange={setPlan} opts={["All Plans", "Monthly", "Quarterly", "Annual"]} />
      </div>

      {subscriptions.length === 0 ? (
        <EmptyState title="No subscriptions found" />
      ) : (
        <>
          <div style={{ ...css.card, overflowX: "auto", marginBottom: 20 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>{["User", "Email", "Plan", "Status", "Start", "Next Billing", "Amount", "Actions"].map((h) => <th key={h} style={css.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {subscriptions.map((s) => (
                  <tr key={s.id}>
                    <td style={css.td}>{s.user}</td>
                    <td style={css.td}>{s.email}</td>
                    <td style={css.td}>{s.plan}</td>
                    <td style={css.td}><StatusBadge status={s.status} /></td>
                    <td style={css.td}>{s.startDate}</td>
                    <td style={css.td}>{s.nextBilling}</td>
                    <td style={css.td}>${s.amount}</td>
                    <td style={css.td}>
                      {s.status !== "Cancelled" && (
                        <button style={css.btn(T.redLt, T.redTx)} onClick={() => apiFetch(`/subscriptions/${s.id}/cancel`, { method: "PATCH" }).then(() => { fetchRows(); setSuccessMsg("Subscription cancelled"); setTimeout(() => setSuccessMsg(""), 1500); })}>Cancel</button>
                      )}
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