import { Instagram, Twitter, Facebook, Linkedin } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { C, FOOTER_COLS } from "./constants/tokens";

const LINK_MAP = {
  "AI Calorie Tracker":   { type: "scroll", id: "ai-tracker" },
  "Online Consultation":  { type: "scroll", id: "consultation" },
  "Diet Plans":           { type: "route", to: "/diet" },
  "Blog":                 { type: "route", to: "/blog" },
  "About Us":             { type: "route", to: "/about" },
  "Contact Support":      { type: "route", to: "/support" },
};

/**
 * Footer shares the same red (#A50C05) background as the Newsletter above it,
 * making them feel like one unified section.
 * HIPAA, GDPR, Press Kit, HIPAA Notice — all removed.
 */
const linkStyle = {
  fontFamily: "'Inter', sans-serif",
  fontSize: 14,
  color: "rgba(255,255,255,0.65)",
  textDecoration: "none",
  transition: "color 0.2s",
};

const plainStyle = {
  fontFamily: "'Inter', sans-serif",
  fontSize: 14,
  color: "rgba(255,255,255,0.4)",
  cursor: "default",
};

export default function Footer() {
  const navigate = useNavigate();

  const handleScroll = (id) => {
    if (window.location.pathname === "/") {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/", { state: { scrollTo: id } });
    }
  };

  return (
    /* Same red background as Newsletter — visually ONE block */
    <footer style={{ background: C.tomato, padding: "0 24px 40px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* ── Thin divider within the red block ── */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 52, marginBottom: 48 }}>

          {/* ── Main grid ── */}
          <div
            className="footer-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr",
              gap: 32,
              marginBottom: 48,
            }}
          >
            {/* ── Brand column ── */}
            <div>
              {/* Logo on red — Nutri white, lens lime */}
              <div
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 800, fontSize: 28,
                  color: C.white, marginBottom: 14,
                  letterSpacing: "-0.5px",
                }}
              >
                Nutri<span style={{ color: C.lime }}>lens</span>
              </div>

              <p
                style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 14,
                  color: "rgba(255,255,255,0.65)",
                  lineHeight: 1.7, maxWidth: 230, marginBottom: 24,
                }}
              >
                AI-powered nutrition meets human expertise. Your health transformation
                starts here.
              </p>

              {/* Social icons */}
              <div style={{ display: "flex", gap: 14 }}>
                {[Instagram, Twitter, Facebook, Linkedin].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: "rgba(255,255,255,0.12)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: C.white, transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = C.ochre)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
                  >
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            </div>

            {/* ── Link columns ── */}
            {FOOTER_COLS.map((col) => (
              <div key={col.title}>
                <div
                  style={{
                    fontFamily: "'Outfit', sans-serif", fontWeight: 700,
                    fontSize: 13,
                    /* green column headings on red = energetic contrast */
                    color: C.lime,
                    letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 18,
                  }}
                >
                  {col.title}
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                  {col.links.map((link) => {
                    const entry = LINK_MAP[link];
                    if (entry?.type === "route") {
                      return (
                        <li key={link}>
                          <Link
                            to={entry.to}
                            style={linkStyle}
                            onMouseEnter={(e) => (e.currentTarget.style.color = C.white)}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.65)")}
                          >
                            {link}
                          </Link>
                        </li>
                      );
                    }
                    if (entry?.type === "scroll") {
                      return (
                        <li key={link}>
                          <button
                            onClick={() => handleScroll(entry.id)}
                            style={{ ...linkStyle, background: "none", border: "none", padding: 0, cursor: "pointer" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = C.white)}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.65)")}
                          >
                            {link}
                          </button>
                        </li>
                      );
                    }
                    return (
                      <li key={link}>
                        <span style={plainStyle}>{link}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.1)",
            paddingTop: 24,
            display: "flex", justifyContent: "space-between",
            alignItems: "center", flexWrap: "wrap", gap: 12,
          }}
        >
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
            © 2025 NutriLens. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
