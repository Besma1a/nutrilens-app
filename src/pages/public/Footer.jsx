import { Instagram, Twitter, Facebook, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";
import { C, FOOTER_COLS } from "./constants/tokens";

/**
 * Footer shares the same red (#A50C05) background as the Newsletter above it,
 * making them feel like one unified section.
 * HIPAA, GDPR, Press Kit, HIPAA Notice — all removed.
 */
export default function Footer() {
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
              gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
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
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        style={{
                          fontFamily: "'Inter', sans-serif", fontSize: 14,
                          color: "rgba(255,255,255,0.65)",
                          transition: "color 0.2s",
                        }}
                        onMouseEnter={(e) => (e.target.style.color = C.white)}
                        onMouseLeave={(e) => (e.target.style.color = "rgba(255,255,255,0.65)")}
                      >
                        {link}
                      </a>
                    </li>
                  ))}
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
          <Link
            to="/support"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 700,
              color: C.white,
              border: "1px solid rgba(255,255,255,0.35)",
              padding: "8px 14px",
              borderRadius: 999,
              textDecoration: "none",
            }}
          >
            Contact Support
          </Link>
        </div>
      </div>
    </footer>
  );
}
