import { useEffect, useState } from "react";
import { T, css, StatusBadge, Avatar, SearchBar, Select, PageHead, KpiCard, Drawer, DrawerField, EmptyState, SuccessMsg, Pagination } from "./adminUtils";
import { apiFetch } from "../../services/adminApi";
import useDebouncedValue from "../../hooks/useDebouncedValue";

export default function TestimonialsPage() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusF, setStatusF] = useState("All Status");
  const [userDrawer, setUserDrawer] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams({ search: debouncedSearch, status: statusF, page: String(currentPage), limit: "5" });
    apiFetch(`/testimonials?${params.toString()}`).then((data) => {
      setItems(data.testimonials || []);
      setTotalPages(data.totalPages || 1);
    }).catch(() => {});
  }, [debouncedSearch, statusF, currentPage]);

  const approve = (id) => {
    apiFetch(`/testimonials/${id}/approve`, { method: "PATCH" }).then(() => setItems((p) => p.map((t) => (t.id === id ? { ...t, status: "Approved" } : t))));
    setUserDrawer(prev => (prev?.id === id ? { ...prev, status: "Approved" } : prev));
    setSuccessMsg("Testimonial approved");
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  const reject = (id) => {
    apiFetch(`/testimonials/${id}/reject`, { method: "PATCH" }).then(() => setItems((p) => p.map((t) => (t.id === id ? { ...t, status: "Rejected", featured: false } : t))));
    setUserDrawer(prev => (prev?.id === id ? { ...prev, status: "Rejected", featured: false } : prev));
    setSuccessMsg("Testimonial rejected");
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  const feature = (id) => {
    apiFetch(`/testimonials/${id}/feature`, { method: "PATCH" }).then(() => setItems((p) => p.map((t) => (t.id === id ? { ...t, featured: !t.featured } : t))));
    setUserDrawer(prev => (prev?.id === id ? { ...prev, featured: !prev.featured } : prev));
    setSuccessMsg(featured ? "Unfeatured" : "Featured");
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  const pending = items.filter(t => t.status === "Pending").length;
  const approved = items.filter(t => t.status === "Approved").length;
  const featured = items.filter(t => t.featured).length;

  return (
    <>
      <PageHead title="Testimonial Moderation" sub="Approve, reject, and feature testimonials displayed to visitors." />
      <SuccessMsg message={successMsg} show={!!successMsg} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Pending Review", value: pending, icon: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /></> },
          { label: "Approved", value: approved, icon: <><polyline points="20 6 9 17 4 12" /></> },
          { label: "Featured", value: featured, icon: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /> },
        ].map(k => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search testimonials..." />
        <Select value={statusF} onChange={setStatusF} opts={["All Status", "Pending", "Approved", "Rejected"]} />
      </div>

      {items.length === 0 ? (
        <EmptyState title="No testimonials found" />
      ) : (
        <>
          <div style={css.cardPad}>
            {items.map((t, i) => (
              <div key={t.id} style={{ display: "flex", gap: 16, padding: "18px 0", borderBottom: i < paginatedItems.length - 1 ? `1px solid ${T.grayLt}` : "none" }}>
                <div style={{ cursor: "pointer" }} onClick={() => setUserDrawer(t)}>
                  <Avatar name={t.name} size={42} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                    <span
                      style={{ fontSize: 14, fontWeight: 700, color: T.text, cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted" }}
                      onClick={() => setUserDrawer(t)}
                    >
                      {t.name}
                    </span>
                    <span style={css.badge(T.greenLight, T.greenTx)}>{t.plan}</span>
                    <StatusBadge status={t.status} />
                    {t.featured && <span style={css.badge(T.greenBg, T.greenDark)}>★ Featured</span>}
                  </div>
                  <div style={{ fontSize: 12, color: T.gray, marginBottom: 8 }}>
                    <span style={{ color: "#f59e0b" }}>{"★".repeat(t.rating)}{"☆".repeat(5 - t.rating)}</span>
                    {"  "}{t.date}
                  </div>
                  <p style={{ fontSize: 13, color: T.textMd, lineHeight: 1.65, margin: "0 0 12px", maxWidth: 640 }}>
                    "{t.text}"
                  </p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {t.status !== "Approved" && (
                      <button style={css.btn(T.greenLight, T.greenTx)} onClick={() => approve(t.id)}>
                        Approve
                      </button>
                    )}
                    {t.status !== "Rejected" && (
                      <button style={css.btn(T.redLt, T.redTx)} onClick={() => reject(t.id)}>
                        Reject
                      </button>
                    )}
                    {t.status === "Approved" && (
                      <button style={css.btn(T.white, T.text, `1px solid ${T.border}`)} onClick={() => feature(t.id)}>
                        {t.featured ? "★ Unfeature" : "★ Feature"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      )}

      <Drawer open={!!userDrawer} onClose={() => setUserDrawer(null)} title="User Profile">
        {userDrawer && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${T.border}` }}>
              <Avatar name={userDrawer.name} size={54} />
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>{userDrawer.name}</div>
                <span style={css.badge(T.greenLight, T.greenTx)}>{userDrawer.plan}</span>
              </div>
            </div>
            <DrawerField label="Testimonial Status" value={userDrawer.status} />
            <DrawerField label="Rating" value={`${"★".repeat(userDrawer.rating)}${"☆".repeat(5 - userDrawer.rating)} (${userDrawer.rating}/5)`} />
            <DrawerField label="Date Submitted" value={userDrawer.date} />
            <DrawerField label="Featured" value={userDrawer.featured ? "Yes — shown on homepage" : "No"} />
            <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
              {userDrawer.status !== "Approved" && (
                <button style={css.btn(T.greenLight, T.greenTx)} onClick={() => approve(userDrawer.id)}>
                  Approve
                </button>
              )}
              {userDrawer.status !== "Rejected" && (
                <button style={css.btn(T.redLt, T.redTx)} onClick={() => reject(userDrawer.id)}>
                  Reject
                </button>
              )}
            </div>
          </>
        )}
      </Drawer>
    </>
  );
}