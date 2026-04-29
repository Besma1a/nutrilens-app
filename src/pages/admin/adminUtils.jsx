import { createContext, useContext, useEffect, useState } from "react";

export const AdminUiContext = createContext({ showPageHead: true });

// --- TYPOGRAPHY SCALE -----------------------------------------------------
export const Typography = {
  h1: { fontSize: 28, fontWeight: 800, lineHeight: 1.2, fontFamily: "'Outfit', sans-serif" },
  h2: { fontSize: 22, fontWeight: 700, lineHeight: 1.3, fontFamily: "'Outfit', sans-serif" },
  h3: { fontSize: 17, fontWeight: 700, lineHeight: 1.35, fontFamily: "'Outfit', sans-serif" },
  body: { fontSize: 14, fontWeight: 400, lineHeight: 1.6, fontFamily: "'Inter', sans-serif" },
  bodySm: { fontSize: 12, fontWeight: 400, lineHeight: 1.5, fontFamily: "'Inter', sans-serif" },
  label: { fontSize: 12, fontWeight: 600, lineHeight: 1.4, fontFamily: "'Inter', sans-serif" },
};

// --- SPACING SCALE --------------------------------------------------------
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

// --- DESIGN TOKENS ---------------------------------------------------------
export const T = {
  forest: "#2B5726",
  tomato: "#A50C05",
  lime: "#DEE660",
  white: "#ffffff",
  bg: "#ffffff",
  green: "#2B5726",
  greenDark: "#2B5726",
  greenLight: "#f0fdf4",
  greenBg: "#f0fdf4",
  greenTx: "#2B5726",
  red: "#A50C05",
  redLt: "#fee2e2",
  redTx: "#A50C05",
  amber: "#f59e0b",
  amberLt: "#fef3c7",
  amberTx: "#d97706",
  blue: "#2563eb",
  blueLt: "#dbeafe",
  purple: "#7c3aed",
  purpleLt: "#ede9fe",
  border: "#e2e8f0",
  gray: "#64748b",
  grayLt: "#f1f5f9",
  grayMd: "#94a3b8",
  text: "#0f172a",
  textMd: "#374151",
  textSm: "#64748b",
  breakpoints: { mobile: 480, tablet: 768, desktop: 1024 },
};

export const css = {
  card: {
    background: T.white,
    border: `1px solid ${T.border}`,
    borderRadius: 16,
    overflow: "hidden",
  },
  cardPad: {
    background: T.white,
    border: `1px solid ${T.border}`,
    borderRadius: 16,
    padding: `${Spacing.lg}px ${Spacing.xl}px`,
  },
  th: {
    fontSize: 11,
    fontWeight: 700,
    color: T.gray,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    padding: `${Spacing.md}px ${Spacing.lg}px`,
    textAlign: "left",
    borderBottom: `1px solid ${T.border}`,
    background: "#f8fafc",
    whiteSpace: "nowrap",
  },
  td: {
    padding: `13px ${Spacing.lg}px`,
    fontSize: 14,
    borderBottom: `1px solid ${T.grayLt}`,
    verticalAlign: "middle",
  },
  badge: (bg, color) => ({
    display: "inline-flex",
    alignItems: "center",
    padding: `3px 10px`,
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
    background: bg,
    color,
  }),
  btn: (bg, color, border = "none") => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: `8px 16px`,
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    border,
    background: bg,
    color,
    whiteSpace: "nowrap",
    transition: "all 0.2s",
  }),
};

export function IBtn({ title, onClick, danger = false, disabled = false, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={css.btn(danger ? T.redLt : T.forest, danger ? T.red : T.white, "none")}
    >
      {title}
    </button>
  );
}

export function StatusBadge({ status }) {
  const map = {
    Active: [T.greenLight, T.greenTx],
    Approved: [T.greenLight, T.greenTx],
    Resolved: [T.greenLight, T.greenTx],
    Paid: [T.greenLight, T.greenTx],
    Processed: [T.greenLight, T.greenTx],
    Closed: [T.grayLt, T.gray],
    Pending: [T.amberLt, T.amberTx],
    Requested: [T.amberLt, T.amberTx],
    Open: [T.amberLt, T.amberTx],
    Suspended: [T.redLt, T.redTx],
    Rejected: [T.redLt, T.redTx],
    Failed: [T.redLt, T.redTx],
    Refunded: [T.redLt, T.redTx],
    Flagged: [T.redLt, T.redTx],
    High: [T.redLt, T.redTx],
    Medium: [T.amberLt, T.amberTx],
    Low: [T.grayLt, T.gray],
    "In Progress": [T.blueLt, T.blue],
    Waiting: [T.purpleLt, T.purple],
  };
  const [bg, color] = map[status] || [T.grayLt, T.gray];
  return <span style={css.badge(bg, color)}>{status}</span>;
}

export function Avatar({ name, size = 36 }) {
  const ini = name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: T.purple,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.35,
        fontWeight: 700,
        flexShrink: 0,
        letterSpacing: 0.5,
      }}
    >
      {ini}
    </div>
  );
}

export function SearchBar({ value, onChange, placeholder }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: T.white,
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        padding: `12px 14px`,
        minHeight: 46,
        flex: 1,
        maxWidth: 520,
      }}
    >
      <svg width="14" height="14" fill="none" stroke={T.gray} strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ border: "none", outline: "none", fontSize: 15, color: T.text, background: "transparent", width: "100%" }}
      />
    </div>
  );
}

export function Select({ value, onChange, opts }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        padding: `8px 12px`,
        fontSize: 13,
        color: T.text,
        background: T.white,
        outline: "none",
        cursor: "pointer",
      }}
    >
      {opts.map(o => <option key={o}>{o}</option>)}
    </select>
  );
}

export function PageHead({ title, sub }) {
  const { showPageHead } = useContext(AdminUiContext);
  if (!showPageHead) return null;
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ ...Typography.h2, color: T.text, margin: 0, marginBottom: 3 }}>{title}</h2>
      {sub && <p style={{ ...Typography.bodySm, color: T.gray, margin: 0 }}>{sub}</p>}
    </div>
  );
}

export function KpiCard({ label, value, delta, up, icon }) {
  return (
    <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontSize: 12, color: T.gray, marginBottom: 5 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: T.text, lineHeight: 1 }}>{value}</div>
        {delta && <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6, color: up ? T.greenTx : T.red }}>{delta}</div>}
      </div>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: T.greenBg, border: `1px solid ${T.greenLight}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="20" height="20" fill="none" stroke={T.greenDark} strokeWidth="1.8" viewBox="0 0 24 24">{icon}</svg>
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, width = 460, children }) {
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= T.breakpoints.tablet : true);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= T.breakpoints.tablet);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const drawerWidth = isMobile ? "100vw" : `min(${width}px, calc(100vw - 24px))`;

  return (
    <>
      {open && <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 200, backdropFilter: "blur(2px)" }} />}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          width: drawerWidth,
          maxWidth: "100vw",
          background: T.white,
          borderLeft: `1px solid ${T.border}`,
          zIndex: 201,
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s ease",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: isMobile ? `14px 16px` : `18px 24px`,
            borderBottom: `1px solid ${T.border}`,
            position: "sticky",
            top: 0,
            background: T.white,
            zIndex: 1,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{title}</span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: T.gray, display: "flex", alignItems: "center" }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div style={{ padding: isMobile ? "16px" : "20px 24px", flex: 1 }}>{children}</div>
      </div>
    </>
  );
}

export function Modal({ open, onClose, title, width = 500, children }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: T.white,
          borderRadius: 20,
          width: "100%",
          maxWidth: width,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
          animation: "modalAppear 0.3s ease-out",
        }}
      >
        <style>
          {`@keyframes modalAppear { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}
        </style>
        <div
          style={{
            padding: "20px 24px",
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>{title}</div>
          <button
            onClick={onClose}
            style={{
              background: T.grayLt,
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: T.gray,
              transition: "all 0.2s",
            }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

export function DrawerField({ label, value }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.gray, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: T.textMd }}>{value}</div>
    </div>
  );
}

export function FormInput({ label, type = "text", value, onChange, error, placeholder, required = false }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: T.gray, display: "block", marginBottom: 5 }}>
        {label} {required && <span style={{ color: T.red }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        style={{
          width: "100%",
          border: `1px solid ${error ? T.red : T.border}`,
          borderRadius: 8,
          padding: "9px 12px",
          fontSize: 14,
          color: T.text,
          outline: "none",
          boxSizing: "border-box",
        }}
      />
      {error && <div style={{ fontSize: 12, color: T.red, marginTop: 4 }}>{error}</div>}
    </div>
  );
}

export function FormTextarea({ label, value, onChange, error, placeholder, required = false, rows = 4 }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: T.gray, display: "block", marginBottom: 5 }}>
        {label} {required && <span style={{ color: T.red }}>*</span>}
      </label>
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        required={required}
        style={{
          width: "100%",
          border: `1px solid ${error ? T.red : T.border}`,
          borderRadius: 8,
          padding: "9px 12px",
          fontSize: 14,
          color: T.text,
          outline: "none",
          resize: "vertical",
          boxSizing: "border-box",
        }}
      />
      {error && <div style={{ fontSize: 12, color: T.red, marginTop: 4 }}>{error}</div>}
    </div>
  );
}

export function EmptyState({ title = "No results", description = "There is nothing to display right now." }) {
  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 16, padding: 28, background: T.grayLt, textAlign: "center" }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>{title}</div>
      <div style={{ marginTop: 8, color: T.textMd }}>{description}</div>
    </div>
  );
}

export function ErrorMsg({ error, show }) {
  if (!show || !error) return null;
  return (
    <div style={{ marginBottom: 16, padding: 12, background: T.redLt, borderRadius: 12, color: T.red, fontSize: 13 }}>
      {error}
    </div>
  );
}

export function SuccessMsg({ message, show }) {
  if (!show || !message) return null;
  return (
    <div style={{ marginBottom: 16, padding: 12, background: T.greenLight, borderRadius: 12, color: T.greenTx, fontSize: 13 }}>
      {message}
    </div>
  );
}

export function Pagination({ currentPage, totalPages, onPageChange }) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  if (totalPages <= 1) return null;

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 16 }}>
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        style={css.btn(T.grayLt, T.text, "none")}
      >
        Prev
      </button>
      {pages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onPageChange(page)}
          style={css.btn(page === currentPage ? T.forest : T.white, page === currentPage ? T.white : T.text, `1px solid ${T.border}`)}
        >
          {page}
        </button>
      ))}
      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        style={css.btn(T.grayLt, T.text, "none")}
      >
        Next
      </button>
    </div>
  );
}
