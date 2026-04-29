import { createContext } from 'react';

// ─── Admin UI Context ─────────────────────────────────────────────────────
export const AdminUiContext = createContext({ showPageHead: true });

// ─── EMPTY STATE ──────────────────────────────────────────────────────────
export function EmptyState({ title, message }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        textAlign: "center",
        color: "#64748b",
      }}
    >
      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          background: "#f1f5f9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "16px",
          fontSize: "24px",
        }}
      >
        📋
      </div>
      <h3
        style={{
          margin: "0 0 8px",
          fontSize: "18px",
          fontWeight: "600",
          color: "#334155",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          margin: "0",
          fontSize: "14px",
          lineHeight: "1.5",
          maxWidth: "320px",
        }}
      >
        {message}
      </p>
    </div>
  );
}
