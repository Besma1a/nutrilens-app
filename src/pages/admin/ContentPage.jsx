// ContentPage.jsx - FIXED VERSION (Same pattern for all pages)
import { useEffect, useState } from "react";
import { T, css, IBtn, StatusBadge, SearchBar, Select, PageHead, Drawer, DrawerField, EmptyState, SuccessMsg, Pagination } from "./adminUtils";
import { apiFetch } from "../../services/adminApi";
import useDebouncedValue from "../../hooks/useDebouncedValue";

const TYPE_COLORS = {
  Article: [T.greenLight, T.greenTx],
  Guide: [T.blueLt, T.blue],
  Video: [T.grayLt, T.gray],
  Newsletter: [T.purpleLt, T.purple],
};

const RISK_MAP = {
  High: [T.redLt, T.redTx],
  Medium: [T.amberLt, T.amberTx],
  Low: [T.greenLight, T.greenTx],
};

export default function ContentPage() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [typeF, setTypeF] = useState("All Types");
  const [statusF, setStatusF] = useState("All Status");
  const [preview, setPreview] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams({
      search: debouncedSearch,
      type: typeF,
      status: statusF,
      page: String(currentPage),
      limit: "8",
    });
    apiFetch(`/content?${params.toString()}`).then((data) => {
      setItems(data.items || []);
      setTotalPages(data.totalPages || 1);
    }).catch(() => {});
  }, [debouncedSearch, typeF, statusF, currentPage]);

  const pending = items.filter(c => c.status === "Pending").length;

  const approve = (id) => {
    apiFetch(`/content/${id}/approve`, { method: "PATCH" }).then(() => setItems((p) => p.map((c) => c.id === id ? { ...c, status: "Approved" } : c)));
    setPreview(prev => prev?.id === id ? { ...prev, status: "Approved" } : prev);
    setSuccessMsg("Content approved");
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  const reject = (id) => {
    apiFetch(`/content/${id}/reject`, { method: "PATCH" }).then(() => setItems((p) => p.map((c) => c.id === id ? { ...c, status: "Rejected" } : c)));
    setPreview(prev => prev?.id === id ? { ...prev, status: "Rejected" } : prev);
    setSuccessMsg("Content rejected");
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  return (
    <>
      <PageHead title="Content Moderation" sub="Review, approve, and reject submitted content." />
      <SuccessMsg message={successMsg} show={!!successMsg} />

      <div style={{ marginBottom: 12, fontSize: 13, color: T.gray }}>Pending Review ({pending})</div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search content..." />
        <Select value={typeF} onChange={setTypeF} opts={["All Types", "Article", "Guide", "Video", "Newsletter"]} />
        <Select value={statusF} onChange={setStatusF} opts={["All Status", "Pending", "Approved", "Rejected"]} />
      </div>

      {items.length === 0 ? (
        <EmptyState title="No content found" />
      ) : (
        <>
          <div style={{ ...css.card, overflowX: "auto", marginBottom: 20 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>{["Title", "Type", "Author", "Date", "Risk", "Status", "Actions"].map(h => <th key={h} style={css.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {items.map(c => {
                  const [tb, tc] = TYPE_COLORS[c.type] || [T.grayLt, T.gray];
                  const [rb, rc] = RISK_MAP[c.risk];
                  return (
                    <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => setPreview(c)}>
                      <td style={{ ...css.td, fontWeight: 600, color: T.greenDark }}>{c.title}</td>
                      <td style={css.td}><span style={css.badge(tb, tc)}>{c.type}</span></td>
                      <td style={{ ...css.td, color: T.gray }}>{c.author}</td>
                      <td style={{ ...css.td, color: T.gray }}>{c.date}</td>
                      <td style={css.td}><span style={css.badge(rb, rc)}>{c.risk}</span></td>
                      <td style={css.td}><StatusBadge status={c.status} /></td>
                      <td style={css.td} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: 2 }}>
                          <IBtn title="Preview" onClick={() => setPreview(c)}>
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          </IBtn>
                          {c.status !== "Approved" && (
                            <IBtn title="Approve" onClick={() => approve(c.id)}>
                              <svg width="14" height="14" fill="none" stroke={T.greenTx} strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                            </IBtn>
                          )}
                          {c.status !== "Rejected" && (
                            <IBtn title="Reject" danger onClick={() => reject(c.id)}>
                              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
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

      <Drawer open={!!preview} onClose={() => setPreview(null)} title="Content Preview" width={520}>
        {preview && (
          <>
            {preview.risk === "High" && (
              <div style={{ background: T.redLt, border: `1px solid ${T.red}`, borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: T.redTx, fontWeight: 600 }}>
                ⚠ High-risk content — review carefully
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <span style={css.badge(...(TYPE_COLORS[preview.type] || [T.grayLt, T.gray]))}>{preview.type}</span>
              <span style={css.badge(...RISK_MAP[preview.risk])}>{preview.risk} risk</span>
              <StatusBadge status={preview.status} />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: T.text, margin: "0 0 6px" }}>{preview.title}</h3>
            <div style={{ fontSize: 13, color: T.gray, marginBottom: 16 }}>By {preview.author} · {preview.date}</div>
            <div style={{ fontSize: 14, color: T.textMd, lineHeight: 1.7, marginBottom: 24, padding: 16, background: T.bgGreen, borderRadius: 10 }}>{preview.body}</div>
            <DrawerField label="Author" value={preview.author} />
            {preview.status !== "Approved" && preview.status !== "Rejected" && (
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button style={css.btn(T.greenLight, T.greenTx)} onClick={() => { approve(preview.id); setPreview(null); }}>Approve</button>
                <button style={css.btn(T.redLt, T.redTx)} onClick={() => { reject(preview.id); setPreview(null); }}>Reject</button>
              </div>
            )}
          </>
        )}
      </Drawer>
    </>
  );
}