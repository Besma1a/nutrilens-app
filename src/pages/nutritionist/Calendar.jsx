import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { nutritionistSessionsApi } from "../../services/api";

// ─── Responsive hook ──────────────────────────────────────────────────────────
function useWindowWidth() {
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const v = {
  green:       "var(--green)",
  greenLight:  "var(--green-light)",
  greenDark:   "var(--green-dark)",
  blueLight:   "var(--blue-light)",
  blueDark:    "var(--blue-dark)",
  amberLight:  "var(--amber-light)",
  amberDark:   "var(--amber-dark)",
  red:         "var(--red)",
  gray800:     "var(--gray-800)",
  gray700:     "var(--gray-700)",
  gray600:     "var(--gray-600)",
  gray500:     "var(--gray-500)",
  gray400:     "var(--gray-400)",
  gray300:     "var(--gray-300)",
  gray50:      "var(--gray-50)",
  border:      "var(--border)",
  borderLight: "var(--border-light)",
  rSm:         "var(--r-sm)",
  rMd:         "var(--r-md)",
  rLg:         "var(--r-lg)",
  rXl:         "var(--r-xl)",
  shadowSm:    "var(--shadow-sm)",
  shadowLg:    "var(--shadow-lg)",
};

const card = {
  background: "white",
  border: `1px solid ${v.border}`,
  borderRadius: v.rLg,
  padding: "20px",
  boxShadow: v.shadowSm,
};

const pillBase = {
  fontSize: 9.5, fontWeight: 500, padding: "2px 6px",
  borderRadius: 4, marginBottom: 3,
  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  cursor: "pointer",
};

const pillColors = {
  green: { background: v.greenLight, color: v.greenDark },
  amber: { background: v.amberLight, color: v.amberDark },
  blue:  { background: v.blueLight,  color: v.blueDark  },
};

const badgeColors = {
  awaiting: { background: v.amberLight, color: v.amberDark },
  approved: { background: v.greenLight, color: v.greenDark },
  rejected: { background: "var(--red-light, #fde8e8)", color: "var(--red-dark, #9b1c1c)" },
};

// ─── Date helpers ─────────────────────────────────────────────────────────────
const TODAY_ISO = new Date().toISOString().slice(0, 10);

function parseISO(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isSameDay(isoA, isoB) { return isoA === isoB; }
function isAfterDay(isoDate, referenceISO) { return isoDate > referenceISO; }

function formatDisplayDate(isoDate) {
  const d = parseISO(isoDate);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function sessionColor(type = "") {
  if (type.toLowerCase().includes("review") || type.toLowerCase().includes("check")) return "blue";
  if (type.toLowerCase().includes("follow") || type.toLowerCase().includes("adjust")) return "amber";
  return "green";
}

function buildCalendarRows(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalDays   = lastDay.getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  const cells = [];

  for (let i = startOffset - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    const iso = `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    cells.push({ n: d, iso, other: true });
  }

  for (let d = 1; d <= totalDays; d++) {
    const iso = `${year}-${String(month + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    cells.push({ n: d, iso, other: false });
  }

  const remainder = cells.length % 7;
  if (remainder !== 0) {
    const needed = 7 - remainder;
    for (let d = 1; d <= needed; d++) {
      const iso = `${year}-${String(month + 2).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      cells.push({ n: d, iso, other: true });
    }
  }

  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// ─── Helper: safely extract array from any API response shape ─────────────────
function extractArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  // Common API wrapper shapes
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.sessions)) return data.sessions;
  if (Array.isArray(data.items)) return data.items;
  // Last resort: grab the first array-valued key
  const firstArray = Object.values(data).find(Array.isArray);
  if (firstArray) return firstArray;
  console.warn("nutritionistSessionsApi.list() returned unexpected shape:", data);
  return [];
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const labels = { awaiting: "Awaiting", approved: "Approved", rejected: "Rejected" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 9px", borderRadius: 20,
      fontSize: 11, fontWeight: 600,
      whiteSpace: "nowrap",
      ...badgeColors[status],
    }}>
      {labels[status]}
    </span>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ session, onClose, onApprove, onReject, isActioning }) {
  const [zoomLink, setZoomLink] = useState(session.zoom || "");
  const isResolved = session.status === "approved" || session.status === "rejected";

  const inp = {
    height: 40, border: `1px solid ${v.border}`, borderRadius: v.rMd,
    padding: "0 14px", fontSize: 13, fontFamily: "inherit",
    color: v.gray700, background: "white", outline: "none", width: "100%",
    boxSizing: "border-box",
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 300 }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: "calc(100% - 32px)", maxWidth: 480, background: "white", borderRadius: v.rXl,
        boxShadow: v.shadowLg, zIndex: 400, overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 20px", borderBottom: `1px solid ${v.borderLight}`,
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: v.gray800 }}>Consultation Request</div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: v.rSm, border: `1px solid ${v.border}`,
            background: "white", display: "flex", alignItems: "center",
            justifyContent: "center", cursor: "pointer", fontSize: 14, color: v.gray500,
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px" }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: v.gray600, marginBottom: 6 }}>Patient</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: v.gray800 }}>{session.patient}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: v.gray600, marginBottom: 6 }}>Date</div>
              <div style={{ fontSize: 13, color: v.gray700 }}>{formatDisplayDate(session.isoDate)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: v.gray600, marginBottom: 6 }}>Time</div>
              <div style={{ fontSize: 13, color: v.gray700 }}>{session.time}</div>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: v.gray600, marginBottom: 6 }}>Session Type</div>
            <div style={{ fontSize: 13, color: v.gray700 }}>{session.type}</div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: v.gray600, marginBottom: 6 }}>Patient Notes</div>
            <div style={{
              fontSize: 13, color: v.gray600, background: v.gray50,
              borderRadius: v.rMd, padding: "10px 14px", lineHeight: 1.6,
              border: `1px solid ${v.borderLight}`,
            }}>
              {session.notes || "No notes provided."}
            </div>
          </div>

          {session.status !== "rejected" && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: v.gray600, marginBottom: 6 }}>Zoom Meeting Link</div>
              <input
                type="url"
                value={zoomLink}
                onChange={(e) => setZoomLink(e.target.value)}
                placeholder="https://zoom.us/j/..."
                disabled={isResolved}
                style={{ ...inp, background: isResolved ? v.gray50 : "white", color: isResolved ? v.gray400 : v.gray700 }}
              />
              {session.status === "approved" && session.zoom && (
                <div style={{ fontSize: 11, color: v.greenDark, marginTop: 5 }}>✓ Zoom link saved</div>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              disabled={isResolved || isActioning}
              onClick={() => onApprove(session.id, zoomLink)}
              style={{
                flex: 1, minWidth: 120, height: 42, borderRadius: v.rMd, border: "none",
                background: (isResolved || isActioning) ? v.gray400 : v.green,
                color: "white", fontSize: 13, fontWeight: 600,
                cursor: (isResolved || isActioning) ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              {isActioning ? (
                <>
                  <div style={{ width: 13, height: 13, border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
                  Working…
                </>
              ) : isResolved ? "Already Resolved" : "Approve & Add Link"}
            </button>
            <button
              disabled={isResolved || isActioning}
              onClick={() => onReject(session.id)}
              style={{
                height: 42, padding: "0 18px", borderRadius: v.rMd,
                border: `1px solid ${v.red}`, background: "white",
                color: (isResolved || isActioning) ? v.gray400 : v.red,
                fontSize: 13, fontWeight: 600,
                cursor: (isResolved || isActioning) ? "not-allowed" : "pointer",
              }}
            >
              Reject
            </button>
            <button onClick={onClose} style={{
              height: 42, padding: "0 18px", borderRadius: v.rMd,
              border: `1px solid ${v.border}`, background: "white",
              color: v.gray600, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

// ─── RequestCard ──────────────────────────────────────────────────────────────
function RequestCard({ session, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={() => onClick(session.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: `1px solid ${v.border}`, borderRadius: v.rMd, padding: 14, marginBottom: 10,
        cursor: "pointer", background: hovered ? v.gray50 : "white", transition: "background .12s",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: v.gray800 }}>{session.patient}</div>
      <div style={{ fontSize: 11, color: v.gray500, marginTop: 2 }}>
        {session.time} · {session.type}
      </div>
      {session.status === "approved" && session.zoom && (
        <div style={{ fontSize: 11, color: v.greenDark, marginTop: 3 }}>🔗 Zoom link added</div>
      )}
      <div style={{ marginTop: 6 }}>
        <StatusBadge status={session.status} />
      </div>
    </div>
  );
}

// ─── CalendarGrid ─────────────────────────────────────────────────────────────
function CalendarGrid({ sessions, onSessionClick, year, month }) {
  const [hoveredCell, setHoveredCell] = useState(null);

  const calRows = useMemo(() => buildCalendarRows(year, month), [year, month]);

  const sessionsByDate = useMemo(() => {
    const map = {};
    sessions.forEach((s) => {
      if (!map[s.isoDate]) map[s.isoDate] = [];
      map[s.isoDate].push(s);
    });
    return map;
  }, [sessions]);

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(7,1fr)",
      gap: 1, background: v.border, borderRadius: v.rMd, overflow: "hidden",
    }}>
      {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
        <div key={d} style={{
          background: v.gray50, padding: "8px 4px",
          textAlign: "center", fontSize: 10, fontWeight: 600, color: v.gray400,
        }}>
          {d}
        </div>
      ))}

      {calRows.flat().map((cell, i) => {
        const isToday   = cell.iso === TODAY_ISO;
        const isHovered = hoveredCell === i;
        const daySessions = (!cell.other && sessionsByDate[cell.iso]) || [];
        const visible  = daySessions.slice(0, 2);
        const overflow = daySessions.length - visible.length;

        return (
          <div
            key={i}
            style={{
              background: isHovered ? v.greenLight : cell.other ? v.gray50 : "white",
              padding: 8, minHeight: 72, cursor: "default", transition: "background .12s",
            }}
            onMouseEnter={() => setHoveredCell(i)}
            onMouseLeave={() => setHoveredCell(null)}
          >
            {isToday ? (
              <div style={{
                width: 22, height: 22, borderRadius: "50%", background: v.green,
                color: "white", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 11, fontWeight: 700, marginBottom: 4,
              }}>
                {cell.n}
              </div>
            ) : (
              <div style={{
                fontSize: 12, color: cell.other ? v.gray300 : v.gray700,
                marginBottom: 6, fontWeight: 500,
              }}>
                {cell.n}
              </div>
            )}

            {visible.map((s) => (
              <div
                key={s.id}
                onClick={() => onSessionClick(s.id)}
                style={{ ...pillBase, ...pillColors[sessionColor(s.type)] }}
              >
                {s.patient.split(" ")[0]}
              </div>
            ))}

            {overflow > 0 && (
              <div style={{ ...pillBase, ...pillColors.blue }}>+{overflow} more</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function ConsultationManagement() {
  const [sessions,    setSessions]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [activeId,    setActiveId]    = useState(null);
  const [isActioning, setIsActioning] = useState(false);

  const windowWidth = useWindowWidth();
  const isMobile  = windowWidth < 640;
  const isTablet  = windowWidth >= 640 && windowWidth < 1024;
  const isDesktop = windowWidth >= 1024;

  const now = new Date();
  const [calYear,  setCalYear]  = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  // ── Fetch all sessions for this nutritionist ───────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        // API: GET /api/v1/consultations/nutritionist-sessions/
        // Returns sessions in Calendar shape: { id, patient, isoDate, time, type, notes, status, zoom }
        const data = await nutritionistSessionsApi.list();
        console.log("nutritionistSessionsApi.list() response:", data); // helpful for debugging shape
        setSessions(extractArray(data));
      } catch (err) {
        console.error("Failed to load consultations:", err);
        setError(err.message || "Failed to load consultations.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Safe sessions guard — always an array even if state somehow breaks ─────
  const safeSessions = Array.isArray(sessions) ? sessions : [];

  const todaySessions    = safeSessions.filter((s) => isSameDay(s.isoDate, TODAY_ISO));
  const upcomingSessions = safeSessions.filter((s) => isAfterDay(s.isoDate, TODAY_ISO));
  const activeSession    = safeSessions.find((s) => s.id === activeId) || null;

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  // ── Approve ────────────────────────────────────────────────────────────────
  const handleApprove = async (id, zoomLink) => {
    setIsActioning(true);
    try {
      // Optimistic update
      setSessions((prev) =>
        prev.map((s) => s.id === id ? { ...s, status: "approved", zoom: zoomLink } : s)
      );
      // API: POST /api/v1/consultations/nutritionist-sessions/{id}/approve/
      await nutritionistSessionsApi.approve(id, zoomLink);
      setActiveId(null);
    } catch (err) {
      console.error("Approve failed:", err);
      // Rollback optimistic update on failure
      setSessions((prev) =>
        prev.map((s) => s.id === id ? { ...s, status: "awaiting" } : s)
      );
      setError("Failed to approve consultation. Please try again.");
    } finally {
      setIsActioning(false);
    }
  };

  // ── Reject ─────────────────────────────────────────────────────────────────
  const handleReject = async (id) => {
    setIsActioning(true);
    try {
      // Optimistic update
      setSessions((prev) =>
        prev.map((s) => s.id === id ? { ...s, status: "rejected", zoom: "" } : s)
      );
      // API: POST /api/v1/consultations/nutritionist-sessions/{id}/reject/
      await nutritionistSessionsApi.reject(id);
      setActiveId(null);
    } catch (err) {
      console.error("Reject failed:", err);
      // Rollback optimistic update on failure
      setSessions((prev) =>
        prev.map((s) => s.id === id ? { ...s, status: "awaiting" } : s)
      );
      setError("Failed to reject consultation. Please try again.");
    } finally {
      setIsActioning(false);
    }
  };

  if (loading) return (
    <div style={{ padding: 40, textAlign: "center", color: v.gray400, fontSize: 13 }}>
      Loading consultations…
    </div>
  );

  if (error) return (
    <div style={{ padding: 40, textAlign: "center", color: v.red, fontSize: 13 }}>
      {error}
    </div>
  );

  const topGridStyle = isDesktop
    ? { display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, marginBottom: 16 }
    : { display: "flex", flexDirection: "column", gap: 14, marginBottom: 14 };

  const upcomingGridStyle = {
    display: "grid",
    gridTemplateColumns: isMobile
      ? "1fr"
      : isTablet
        ? "repeat(2, 1fr)"
        : "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 12,
  };

  return (
    <>
      {activeSession && (
        <Modal
          session={activeSession}
          onClose={() => setActiveId(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          isActioning={isActioning}
        />
      )}

      {/* Top row: Calendar + Today */}
      <div style={topGridStyle}>

        {/* Calendar */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: v.gray800 }}>
              {MONTH_NAMES[calMonth]} {calYear}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={prevMonth} style={{
                width: 34, height: 34, borderRadius: v.rSm,
                border: `1px solid ${v.border}`, background: "white", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <ChevronLeft size={16} />
              </button>
              <button onClick={nextMonth} style={{
                width: 34, height: 34, borderRadius: v.rSm,
                border: `1px solid ${v.border}`, background: "white", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <CalendarGrid
            sessions={safeSessions}
            onSessionClick={setActiveId}
            year={calYear}
            month={calMonth}
          />
        </div>

        {/* Today sidebar */}
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: v.gray600, marginBottom: 14 }}>
            Today · {formatDisplayDate(TODAY_ISO)}
          </div>
          {todaySessions.length === 0 ? (
            <div style={{ fontSize: 12, color: v.gray400, textAlign: "center", padding: "20px 0" }}>
              No consultations today
            </div>
          ) : (
            todaySessions.map((s) => (
              <RequestCard key={s.id} session={s} onClick={setActiveId} />
            ))
          )}
        </div>
      </div>

      {/* Upcoming */}
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, color: v.gray600, marginBottom: 16 }}>Upcoming</div>

        {upcomingSessions.length === 0 ? (
          <div style={{ fontSize: 12, color: v.gray400, textAlign: "center", padding: "20px 0" }}>
            No upcoming consultations
          </div>
        ) : (
          <div style={upcomingGridStyle}>
            {upcomingSessions.map((s) => (
              <div
                key={s.id}
                onClick={() => setActiveId(s.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  border: `1px solid ${v.border}`, borderRadius: v.rMd,
                  padding: "12px 14px", cursor: "pointer", background: "white",
                  transition: "background .12s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = v.gray50}
                onMouseLeave={(e) => e.currentTarget.style.background = "white"}
              >
                {/* Date badge */}
                <div style={{
                  minWidth: 46, height: 46, borderRadius: v.rMd,
                  background: v.greenLight,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: v.greenDark, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {formatDisplayDate(s.isoDate).split(" ")[0]}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: v.greenDark, lineHeight: 1.1 }}>
                    {formatDisplayDate(s.isoDate).split(" ")[1]}
                  </div>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: v.gray800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.patient}
                  </div>
                  <div style={{ fontSize: 11, color: v.gray500, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.time} · {s.type}
                  </div>
                </div>

                <StatusBadge status={s.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}