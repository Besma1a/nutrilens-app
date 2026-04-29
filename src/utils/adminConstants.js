// ─── Design Tokens ────────────────────────────────────────────────// 
export const T = {
  // Core colors
  forest: "#2B5726",
  tomato: "#A50C05",
  lime: "#DEE660",
  white: "#ffffff",
  bg: "#ffffff",
  
  // Semantic mappings
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
  
  // Neutral colors
  gray100: "#f3f6f8",
  gray200: "#e5e7eb",
  gray300: "#d1d5db",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray600: "#475569",
  gray700: "#334155",
  gray800: "#1e293b",
  gray900: "#111827",
  
  // Typography
  text: "#111827",
  textMuted: "#64748b",
  textSub: "#94a3b8",
  
  // Borders
  border: "#e5e7eb",
  
  // Spacing
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// ─── CSS Helpers ──────────────────────────────────────────────────
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
    overflow: "hidden",
    padding: "24px",
  },
  input: {
    background: T.white,
    border: `1px solid ${T.border}`,
    borderRadius: 12,
    padding: "14px 16px",
    fontSize: 14,
    color: T.text,
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  btn: (variant = "solid", color = T.green) => ({
    background: variant === "outline" ? "transparent" : color,
    border: `1px solid ${color}`,
    borderRadius: 10,
    padding: "12px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    color: variant === "outline" ? color : "#fff",
    outline: "none",
    transition: "all 0.2s",
    whiteSpace: "nowrap",
  }),
  heading: {
    fontSize: 24,
    fontWeight: 700,
    color: T.text,
    marginBottom: 16,
  },
  subheading: {
    fontSize: 18,
    fontWeight: 600,
    color: T.text,
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    lineHeight: 1.5,
    color: T.textSub,
  },
  textSm: {
    fontSize: 12,
    color: T.textMuted,
  },
  textMd: {
    fontSize: 14,
    fontWeight: 500,
    color: T.text,
  },
  textLg: {
    fontSize: 16,
    fontWeight: 600,
    color: T.text,
  },
  textXl: {
    fontSize: 18,
    fontWeight: 700,
    color: T.text,
  },
  text2xl: {
    fontSize: 24,
    fontWeight: 700,
    color: T.text,
  },
  muted: {
    color: T.textMuted,
  },
  flex: {
    display: "flex",
  },
  flexCol: {
    display: "flex",
    flexDirection: "column",
  },
  flexCenter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  flexBetween: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gap: (size = "md") => ({
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  }[size]),
  full: {
    width: "100%",
    height: "100%",
  },
  relative: {
    position: "relative",
  },
  absolute: {
    position: "absolute",
  },
  rounded: {
    borderRadius: 12,
  },
  roundedFull: {
    borderRadius: 999,
  },
  shadow: {
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  shadowLg: {
    boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
  },
  transition: {
    transition: "all 0.2s",
  },
};

// ─── Spacing System ─────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// ─── Typography System ─────────────────────────────────────────────
export const Typography = {
  heading: {
    fontSize: 24,
    fontWeight: 700,
    color: "#111827",
    marginBottom: 16,
  },
  subheading: {
    fontSize: 18,
    fontWeight: 600,
    color: "#111827",
    marginBottom: 12,
  },
  body: {
    fontSize: 14,
    lineHeight: 1.5,
    color: "#64748b",
  },
  bodySm: {
    fontSize: 12,
    color: "#64748b",
  },
  caption: {
    fontSize: 11.5,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
  },
};
