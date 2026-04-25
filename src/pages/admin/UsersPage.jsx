import { useMemo, useState } from "react";
import { T, css, IBtn, StatusBadge, Avatar, SearchBar, Select, PageHead, Drawer, DrawerField, EmptyState, FormInput, FormTextarea, ErrorMsg, SuccessMsg, Pagination } from "./adminUtils";

const USERS_DATA = [
  { name: "Sarah Johnson", email: "sarah.j@email.com", plan: "Premium", status: "Active", joined: "Jan 15, 2024", phone: "+1 555 0101", consultations: 8, notes: "Long-term client, very engaged." },
  { name: "Michael Chen", email: "michael.c@email.com", plan: "Basic", status: "Active", joined: "Feb 20, 2024", phone: "+1 555 0102", consultations: 3, notes: "Just started." },
  { name: "Emily Davis", email: "emily.d@email.com", plan: "VIP", status: "Suspended", joined: "Jan 10, 2024", phone: "+1 555 0103", consultations: 12, notes: "Payment dispute." },
  { name: "James Wilson", email: "james.w@email.com", plan: "Premium", status: "Active", joined: "Mar 5, 2024", phone: "+1 555 0104", consultations: 5, notes: "" },
  { name: "Lisa Anderson", email: "lisa.a@email.com", plan: "Basic", status: "Pending", joined: "Feb 28, 2024", phone: "+1 555 0105", consultations: 0, notes: "Email not verified." },
];

function ConfirmDialog({ user, onConfirm, onCancel }) {
  if (!user) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)" }}>
      <div style={{ background: T.white, borderRadius: 16, padding: "28px 32px", boxShadow: "0 8px 40px rgba(0,0,0,0.18)", maxWidth: 400, width: "90%" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 8 }}>Delete user?</div>
        <div style={{ fontSize: 14, color: T.gray, marginBottom: 24, lineHeight: 1.6 }}>
          This will permanently remove <strong>{user.name}</strong> ({user.email}). This action cannot be undone.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={css.btn(T.red, "#fff")} onClick={onConfirm}>Yes, delete</button>
          <button style={css.btn(T.white, T.text, `1px solid ${T.border}`)} onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

const validateForm = (form) => {
  const errors = {};
  if (!form.name.trim()) errors.name = "Name required";
  if (!form.email.trim()) errors.email = "Email required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Invalid email";
  if (form.phone.trim() && !/^[+\d\s()-]+$/.test(form.phone)) errors.phone = "Invalid phone";
  return errors;
};

export default function UsersPage() {
  const [users, setUsers] = useState(USERS_DATA);
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("All Status");
  const [planF, setPlanF] = useState("All Plans");
  const [selected, setSelected] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", status: "Active", notes: "" });
  const [formErrors, setFormErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;

  const filtered = useMemo(() => {
    return users.filter(u =>
      (u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())) &&
      (statusF === "All Status" || u.status === statusF) &&
      (planF === "All Plans" || u.plan === planF)
    );
  }, [users, search, statusF, planF]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedUsers = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleBan = (email) => {
    setUsers(p => {
      const next = p.map(u => u.email === email ? { ...u, status: u.status === "Suspended" ? "Active" : "Suspended" } : u);
      if (selected?.email === email) setSelected(prev => ({ ...prev, status: next.find(u => u.email === email).status }));
      return next;
    });
  };

  const requestDelete = (user) => setPendingDelete(user);

  const confirmDelete = () => {
    if (!pendingDelete) return;
    setUsers(p => p.filter(u => u.email !== pendingDelete.email));
    if (selected?.email === pendingDelete.email) setSelected(null);
    setPendingDelete(null);
    setSuccessMsg("User deleted");
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  const openProfile = (u) => {
    setSelected(u);
    setEditMode(false);
    setEditForm({ name: u.name, email: u.email, phone: u.phone, status: u.status, notes: u.notes || "" });
    setFormErrors({});
  };

  const saveEdit = () => {
    if (!selected) return;
    const errors = validateForm(editForm);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setUsers(prev => prev.map(u => u.email === selected.email ? { ...u, ...editForm } : u));
    setSelected(prev => ({ ...prev, ...editForm }));
    setEditMode(false);
    setSuccessMsg("Profile updated");
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  return (
    <>
      <PageHead title="User Management" sub="View, manage, and moderate platform user accounts." />
      <SuccessMsg message={successMsg} show={!!successMsg} />
      <ConfirmDialog user={pendingDelete} onConfirm={confirmDelete} onCancel={() => setPendingDelete(null)} />

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search users..." />
        <Select value={statusF} onChange={setStatusF} opts={["All Status", "Active", "Pending", "Suspended"]} />
        <Select value={planF} onChange={setPlanF} opts={["All Plans", "Basic", "Premium", "VIP"]} />
      </div>

      {paginatedUsers.length === 0 ? (
        <EmptyState title="No users found" message={search ? "Try adjusting your search" : "No users yet"} />
      ) : (
        <>
          <div style={{ ...css.card, overflowX: "auto", marginBottom: 20 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>{["User", "Email", "Plan", "Status", "Joined", "Actions"].map(h => <th key={h} style={css.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {paginatedUsers.map(u => (
                  <tr key={u.email} style={{ cursor: "pointer" }} onClick={() => openProfile(u)}>
                    <td style={css.td}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar name={u.name} size={34} />
                        <span style={{ fontWeight: 600, color: T.text }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ ...css.td, color: T.gray }}>{u.email}</td>
                    <td style={css.td}><span style={css.badge(T.greenLight, T.greenTx)}>{u.plan}</span></td>
                    <td style={css.td}><StatusBadge status={u.status} /></td>
                    <td style={{ ...css.td, color: T.gray }}>{u.joined}</td>
                    <td style={css.td} onClick={e => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 2 }}>
                        <IBtn title="View" onClick={() => openProfile(u)}>
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </IBtn>
                        <IBtn title={u.status === "Suspended" ? "Unban" : "Ban"} onClick={() => toggleBan(u.email)}>
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                        </IBtn>
                        <IBtn title="Delete" danger onClick={() => requestDelete(u)}>
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                        </IBtn>
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

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={editMode ? "Edit Profile" : "User Profile"}>
        {selected && !editMode && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${T.border}` }}>
              <Avatar name={selected.name} size={56} />
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>{selected.name}</div>
                <div style={{ fontSize: 13, color: T.gray }}>{selected.email}</div>
                <div style={{ marginTop: 6 }}><StatusBadge status={selected.status} /></div>
              </div>
            </div>
            <DrawerField label="Phone" value={selected.phone} />
            <DrawerField label="Plan" value={selected.plan} />
            <DrawerField label="Joined" value={selected.joined} />
            <DrawerField label="Consultations" value={selected.consultations} />
            {selected.notes && <DrawerField label="Notes" value={selected.notes} />}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button style={css.btn(T.green, "#fff")} onClick={() => setEditMode(true)}>Edit</button>
              <button style={css.btn(T.white, T.text, `1px solid ${T.border}`)} onClick={() => toggleBan(selected.email)}>
                {selected.status === "Suspended" ? "Unban" : "Suspend"}
              </button>
            </div>
          </>
        )}
        {selected && editMode && (
          <>
            <ErrorMsg error={Object.values(formErrors)[0]} show={Object.keys(formErrors).length > 0} />
            <FormInput label="Name" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} error={formErrors.name} required />
            <FormInput label="Email" type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} error={formErrors.email} required />
            <FormInput label="Phone" type="tel" value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} error={formErrors.phone} />
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.gray, display: "block", marginBottom: 5 }}>Status</label>
              <Select value={editForm.status} onChange={v => setEditForm(p => ({ ...p, status: v }))} opts={["Active", "Pending", "Suspended"]} />
            </div>
            <FormTextarea label="Notes" value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} rows={3} />
            <div style={{ display: "flex", gap: 10 }}>
              <button style={css.btn(T.green, "#fff")} onClick={saveEdit}>Save</button>
              <button style={css.btn(T.white, T.gray, `1px solid ${T.border}`)} onClick={() => setEditMode(false)}>Cancel</button>
            </div>
          </>
        )}
      </Drawer>
    </>
  );
}