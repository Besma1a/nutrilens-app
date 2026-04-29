import { useEffect, useMemo, useState } from "react";
import { T, css, IBtn, StatusBadge, Avatar, SearchBar, Select, PageHead, KpiCard, Drawer, DrawerField, EmptyState, FormInput, FormTextarea, SuccessMsg, Pagination } from "./adminUtils";
import { apiFetch } from "../../services/adminApi";
import useDebouncedValue from "../../hooks/useDebouncedValue";

function loadIndicator(patients) {
  if (patients <= 10) return { label: "Low", color: T.greenTx, bg: T.greenLight };
  if (patients <= 25) return { label: "Medium", color: "#a16207", bg: "#fef9c3" };
  return { label: "High", color: T.redTx, bg: T.redLt };
}

export default function NutritionistsPage() {
  const [nutris, setNutris] = useState([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusF, setStatusF] = useState("All Status");
  const [selected, setSelected] = useState(null);
  const [addMode, setAddMode] = useState(false);
  const [newNutri, setNewNutri] = useState({ name: "", email: "", phone: "", specialty: "", credentials: "", bio: "" });
  const [formErrors, setFormErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState("");
  const [tempPasswordInfo, setTempPasswordInfo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const filtered = useMemo(() => nutris, [nutris]);

  const fetchNutritionists = async () => {
    const params = new URLSearchParams({
      search: debouncedSearch,
      status: statusF,
      page: String(currentPage),
      limit: "10",
    });
    const data = await apiFetch(`/nutritionists?${params.toString()}`);
    const mapped = (data.nutritionists || []).map((n) => ({
      ...n,
      specialty: n.specialization,
      credentials: n.licenseNumber,
      clinic: n.clinic,
      patients: n.patientsCount,
    }));
    setNutris(mapped);
    setTotalPages(data.totalPages || 1);
  };

  useEffect(() => {
    fetchNutritionists().catch(() => {});
  }, [debouncedSearch, statusF, currentPage]);

  const pending = nutris.filter(n => n.status === "Pending").length;
  const active = nutris.filter(n => n.status === "Approved" || n.status === "Active").length;
  const avgPts = active.length ? Math.round(active.reduce((s, n) => s + n.patients, 0) / active.length) : 0;

  const approve = (email) => {
    const n = nutris.find((x) => x.email === email);
    if (!n) return;
    apiFetch(`/nutritionists/${n.id}/status`, { method: "PATCH", body: JSON.stringify({ status: "Approved" }) }).then(fetchNutritionists);
    setSuccessMsg("Nutritionist approved");
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  const reject = (email) => {
    const n = nutris.find((x) => x.email === email);
    if (!n) return;
    apiFetch(`/nutritionists/${n.id}/status`, { method: "PATCH", body: JSON.stringify({ status: "Suspended" }) }).then(fetchNutritionists);
    setSuccessMsg("Nutritionist rejected");
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  const suspend = (email) => {
    const n = nutris.find((x) => x.email === email);
    if (!n) return;
    apiFetch(`/nutritionists/${n.id}/status`, { method: "PATCH", body: JSON.stringify({ status: "Suspended" }) }).then(fetchNutritionists);
    setSuccessMsg("Nutritionist suspended");
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  const validateForm = (form) => {
    const errors = {};
    if (!form.name.trim()) errors.name = "Name required";
    if (!form.email.trim()) errors.email = "Email required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Invalid email";
    return errors;
  };

  const addNutritionist = () => {
    const errors = validateForm(newNutri);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    apiFetch("/nutritionists", {
      method: "POST",
      body: JSON.stringify({
        name: newNutri.name,
        email: newNutri.email,
        phone: newNutri.phone,
        specialization: newNutri.specialty,
        licenseNumber: newNutri.credentials,
        clinic: "",
      }),
    }).then((res) => {
      fetchNutritionists();
      setAddMode(false);
      setNewNutri({ name: "", email: "", phone: "", specialty: "", credentials: "", bio: "" });
      setFormErrors({});
      setTempPasswordInfo(`Temp password for ${newNutri.email}: ${res.tempPassword}`);
      setSuccessMsg("Nutritionist added with Pending status");
      setTimeout(() => setSuccessMsg(""), 3000);
    });
  };

  return (
    <>
      <PageHead title="Nutritionist Management" sub="Approve applications, manage profiles, and monitor caseloads." />
      <SuccessMsg message={successMsg} show={!!successMsg} />
      <SuccessMsg message={tempPasswordInfo} show={!!tempPasswordInfo} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Nutritionists", value: nutris.length, icon: <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></> },
          { label: "Active", value: active, icon: <><polyline points="20 6 9 17 4 12"/></> },
          { label: "Pending Review", value: pending, icon: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></> },
          { label: "Avg Patients", value: avgPts, icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></> },
        ].map(k => <KpiCard key={k.label} {...k} />)}
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search nutritionists..." />
        </div>
        <Select value={statusF} onChange={setStatusF} opts={["All Status", "Approved", "Pending", "Suspended", "Rejected"]} />
        <button style={css.btn(T.green, "#fff")} onClick={() => setAddMode(true)}>
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Nutritionist
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No nutritionists found" />
      ) : (
        <>
          <div style={{ ...css.card, overflowX: "auto", marginBottom: 20 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>{["Name", "Specialty", "Patients / Load", "Status", "Actions"].map(h => <th key={h} style={css.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map(n => {
                  const load = loadIndicator(n.patients);
                  return (
                    <tr key={n.email} style={{ cursor: "pointer" }} onClick={() => setSelected(n)}>
                      <td style={css.td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Avatar name={n.name} size={34} />
                          <div>
                            <div style={{ fontWeight: 600, color: T.text }}>{n.name}</div>
                            <div style={{ fontSize: 12, color: T.gray }}>{n.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ ...css.td, color: T.textMd }}>{n.specialty}</td>
                      <td style={css.td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontWeight: 700, color: T.text }}>{n.patients}</span>
                          <span style={css.badge(load.bg, load.color)}>{load.label}</span>
                        </div>
                      </td>
                      <td style={css.td}><StatusBadge status={n.status} /></td>
                      <td style={css.td} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: 2 }}>
                          <IBtn title="View" onClick={() => setSelected(n)}>
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          </IBtn>
                          {n.status === "Pending" && (
                            <IBtn title="Approve" onClick={() => approve(n.email)}>
                              <svg width="14" height="14" fill="none" stroke={T.greenTx} strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                            </IBtn>
                          )}
                          {n.status !== "Suspended" && (
                            <IBtn title="Suspend" danger onClick={() => suspend(n.email)}>
                              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                            </IBtn>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      )}

      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Nutritionist Profile">
        {selected && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${T.border}` }}>
              <Avatar name={selected.name} size={56} />
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>{selected.name}</div>
                <div style={{ fontSize: 13, color: T.gray }}>{selected.specialty}</div>
                <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                  <StatusBadge status={selected.status} />
                  {selected.status === "Approved" && (
                    <span style={css.badge(loadIndicator(selected.patients).bg, loadIndicator(selected.patients).color)}>
                      {loadIndicator(selected.patients).label} load
                    </span>
                  )}
                </div>
              </div>
            </div>
            <DrawerField label="Email" value={selected.email} />
            <DrawerField label="Phone" value={selected.phone} />
            <DrawerField label="Credentials" value={selected.credentials} />
            <DrawerField label="Active Patients" value={selected.patients} />
            <DrawerField label="Joined" value={selected.joined} />
            {selected.bio && <DrawerField label="Bio" value={selected.bio} />}
            {selected.status === "Pending" && (
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button style={css.btn(T.greenLight, T.greenTx)} onClick={() => approve(selected.email)}>
                  Approve
                </button>
                <button style={css.btn(T.redLt, T.redTx)} onClick={() => reject(selected.email)}>
                  Reject
                </button>
              </div>
            )}
            {selected.status === "Approved" && (
              <div style={{ marginTop: 20 }}>
                <button style={css.btn(T.redLt, T.redTx)} onClick={() => suspend(selected.email)}>
                  Suspend Account
                </button>
              </div>
            )}
          </>
        )}
      </Drawer>

      <Drawer open={addMode} onClose={() => setAddMode(false)} title="Add Nutritionist" width={620}>
        <FormInput label="Full Name" value={newNutri.name} onChange={e => setNewNutri(p => ({ ...p, name: e.target.value }))} error={formErrors.name} required />
        <FormInput label="Email" type="email" value={newNutri.email} onChange={e => setNewNutri(p => ({ ...p, email: e.target.value }))} error={formErrors.email} required />
        <FormInput label="Phone" type="tel" value={newNutri.phone} onChange={e => setNewNutri(p => ({ ...p, phone: e.target.value }))} />
        <FormInput label="Specialty" value={newNutri.specialty} onChange={e => setNewNutri(p => ({ ...p, specialty: e.target.value }))} />
        <FormInput label="Credentials" value={newNutri.credentials} onChange={e => setNewNutri(p => ({ ...p, credentials: e.target.value }))} />
        <FormTextarea label="Professional Bio" value={newNutri.bio} onChange={e => setNewNutri(p => ({ ...p, bio: e.target.value }))} rows={4} />
        <div style={{ display: "flex", gap: 10 }}>
          <button style={css.btn(T.green, "#fff")} onClick={addNutritionist}>
            Submit Application
          </button>
          <button style={css.btn(T.white, T.gray, `1px solid ${T.border}`)} onClick={() => setAddMode(false)}>
            Cancel
          </button>
        </div>
      </Drawer>

    </>
  );
}