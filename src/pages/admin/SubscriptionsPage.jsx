import { useEffect, useMemo, useState } from "react";
import { T, css, StatusBadge, PageHead, EmptyState, SuccessMsg, SearchBar, Select, Pagination, Modal } from "./adminUtils";
import { apiFetch } from "../../services/adminApi";
import useDebouncedValue from "../../hooks/useDebouncedValue";

const EMPTY_FORM = {
  name: "",
  price: "",
  duration_days: 30,
  featuresText: "",
  is_active: true,
  is_featured: false,
  sort_order: 0,
};

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState([]);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [planForm, setPlanForm] = useState(EMPTY_FORM);
  const [showModal, setShowModal] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [plan, setPlan] = useState("All Plans");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [successMsg, setSuccessMsg] = useState("");

  const fetchPlans = async () => {
    const data = await apiFetch("/subscription-plans");
    setPlans(data.plans || []);
  };

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

  const availablePlans = useMemo(
    () => ["All Plans", ...plans.map((item) => item.name)],
    [plans]
  );

  useEffect(() => {
    fetchPlans().catch(() => {});
  }, []);

  useEffect(() => {
    fetchRows().catch(() => {});
  }, [debouncedSearch, plan, currentPage]);

  const resetForm = () => {
    setEditingPlanId(null);
    setPlanForm(EMPTY_FORM);
    setShowModal(false);
  };

  const handleEditPlan = (item) => {
    setEditingPlanId(item.id);
    setPlanForm({
      name: item.name,
      price: item.price,
      duration_days: item.duration_days,
      featuresText: (item.features || []).join("\n"),
      is_active: item.is_active,
      is_featured: item.is_featured,
      sort_order: item.sort_order,
    });
    setShowModal(true);
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    setSavingPlan(true);
    const payload = {
      name: planForm.name.trim(),
      price: planForm.price,
      duration_days: Number(planForm.duration_days),
      features: planForm.featuresText.split("\n").map((line) => line.trim()).filter(Boolean),
      is_active: !!planForm.is_active,
      is_featured: !!planForm.is_featured,
      sort_order: Number(planForm.sort_order),
    };

    try {
      if (editingPlanId) {
        await apiFetch(`/subscription-plans/${editingPlanId}`, { method: "PUT", body: JSON.stringify(payload) });
        setSuccessMsg("Plan updated successfully");
      } else {
        await apiFetch("/subscription-plans", { method: "POST", body: JSON.stringify(payload) });
        setSuccessMsg("Plan created successfully");
      }
      resetForm();
      fetchPlans();
      fetchRows();
      setTimeout(() => setSuccessMsg(""), 1800);
    } finally {
      setSavingPlan(false);
    }
  };

  const handleDeletePlan = async (id) => {
    await apiFetch(`/subscription-plans/${id}`, { method: "DELETE" });
    if (editingPlanId === id) resetForm();
    fetchPlans();
    fetchRows();
    setSuccessMsg("Plan deleted");
    setTimeout(() => setSuccessMsg(""), 1800);
  };

  return (
    <>
      <PageHead title="Subscription Plans & Promotions" sub="Manage pricing, features, and promotional campaigns." />
      <SuccessMsg message={successMsg} show={!!successMsg} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 12, flex: 1, alignItems: "center" }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search subscriptions..." />
          <Select value={plan} onChange={setPlan} opts={availablePlans} />
        </div>
        <button style={css.btn(T.forest, T.white)} onClick={() => { resetForm(); setShowModal(true); }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ marginRight: 6 }}>
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create New Plan
        </button>
      </div>

      <Modal open={showModal} onClose={resetForm} title={editingPlanId ? "Edit Subscription Plan" : "Create New Plan"} width={520}>
        <form onSubmit={handleSavePlan}>
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <label style={labelStyle}>Plan Name</label>
              <input value={planForm.name} onChange={(e) => setPlanForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="e.g. Premium Monthly" style={inputStyle} required />
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={labelStyle}>Price ($)</label>
                <input value={planForm.price} onChange={(e) => setPlanForm((prev) => ({ ...prev, price: e.target.value }))} placeholder="0.00" type="number" min="0" step="0.01" style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>Duration (Days)</label>
                <input value={planForm.duration_days} onChange={(e) => setPlanForm((prev) => ({ ...prev, duration_days: e.target.value }))} placeholder="30" type="number" min="1" style={inputStyle} required />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Display Order</label>
              <input value={planForm.sort_order} onChange={(e) => setPlanForm((prev) => ({ ...prev, sort_order: e.target.value }))} placeholder="0" type="number" min="0" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Features (One per line)</label>
              <textarea value={planForm.featuresText} onChange={(e) => setPlanForm((prev) => ({ ...prev, featuresText: e.target.value }))} placeholder="Personalized meal plans&#10;24/7 Support&#10;Progress tracking" rows={5} style={{ ...inputStyle, resize: "vertical" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, background: T.grayLt, padding: 12, borderRadius: 12 }}>
              <label style={checkRowStyle}>
                <input type="checkbox" checked={planForm.is_active} onChange={(e) => setPlanForm((prev) => ({ ...prev, is_active: e.target.checked }))} />
                Visible on public site
              </label>
              <label style={checkRowStyle}>
                <input type="checkbox" checked={planForm.is_featured} onChange={(e) => setPlanForm((prev) => ({ ...prev, is_featured: e.target.checked }))} />
                Highlight as "Recommended"
              </label>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button type="submit" style={{ ...css.btn(T.forest, T.white), flex: 1, justifyContent: "center", padding: "12px" }} disabled={savingPlan}>
                {savingPlan ? "Saving..." : editingPlanId ? "Update Plan" : "Create Plan"}
              </button>
              <button type="button" style={{ ...css.btn(T.white, T.text, `1px solid ${T.border}`), padding: "12px 20px" }} onClick={resetForm}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      </Modal>

      <div style={{ ...css.card, overflowX: "auto", marginBottom: 32 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Plan", "Price", "Duration", "Visibility", "Featured", "Features", "Actions"].map((h) => <th key={h} style={css.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {plans.map((item) => (
              <tr key={item.id}>
                <td style={css.td}><div style={{ fontWeight: 600, color: T.text }}>{item.name}</div></td>
                <td style={css.td}>${item.price}</td>
                <td style={css.td}>{item.duration_days} days</td>
                <td style={css.td}><StatusBadge status={item.is_active ? "Active" : "Closed"} /></td>
                <td style={css.td}>{item.is_featured ? <span style={{ color: T.amberTx, fontWeight: 600 }}>★ Yes</span> : "No"}</td>
                <td style={{ ...css.td, maxWidth: 320, color: T.textSm }}>{(item.features || []).slice(0, 3).join(", ") || "No features"}</td>
                <td style={css.td}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={css.btn(T.blueLt, T.blue)} onClick={() => handleEditPlan(item)}>Edit</button>
                    <button style={css.btn(T.redLt, T.redTx)} onClick={() => handleDeletePlan(item.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {plans.length === 0 ? (
              <tr>
                <td style={css.td} colSpan={7}>
                  <div style={{ textAlign: "center", padding: "40px 0", color: T.gray }}>
                    No subscription plans found. Click "Create New Plan" to get started.
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 32, marginTop: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 16 }}>
          Subscription Transactions
        </div>
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

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: T.gray,
  marginBottom: 6,
};

const inputStyle = {
  width: "100%",
  border: `1px solid ${T.border}`,
  borderRadius: 10,
  padding: "11px 14px",
  fontSize: 14,
  color: T.text,
  outline: "none",
  background: T.white,
  boxSizing: "border-box",
};

const checkRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontSize: 14,
  color: T.textMd,
};