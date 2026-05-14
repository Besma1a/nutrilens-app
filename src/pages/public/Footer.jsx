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
              {/* Logo on red — aperture sprout, white blades, lime leaf */}
              <div style={{ marginBottom: 14 }}>
                <svg viewBox="0 0 210 44" width="210" height="44" style={{ display: "block" }} xmlns="http://www.w3.org/2000/svg">
                  <path style={{ fill: "rgba(255,255,255,0.92)", stroke: "none" }} d="M22,22 L33,11 A15.6,15.6 0 0,1 33,33 Z"/>
                  <path style={{ fill: "rgba(255,255,255,0.92)", stroke: "none" }} d="M22,22 L33,11 A15.6,15.6 0 0,1 33,33 Z" transform="rotate(120 22 22)"/>
                  <path style={{ fill: "rgba(255,255,255,0.92)", stroke: "none" }} d="M22,22 L33,11 A15.6,15.6 0 0,1 33,33 Z" transform="rotate(240 22 22)"/>
                  <circle cx="22" cy="22" r="7" style={{ fill: "#A50C05", stroke: "none" }}/>
                  <path style={{ fill: "#DEE660", stroke: "none" }} d="M22,17.5 C23.4,17.5 25.5,19 25.5,21.5 C25.5,24 23.4,25.2 22,25.2 C20.6,25.2 18.5,24 18.5,21.5 C18.5,19 20.6,17.5 22,17.5Z"/>
                  <line x1="22" y1="17.5" x2="22" y2="25.2" style={{ stroke: "#A50C05", strokeWidth: 0.6, strokeLinecap: "round" }}/>
                  <line x1="22" y1="25.2" x2="22" y2="27.5" style={{ stroke: "#DEE660", strokeWidth: 1.2, strokeLinecap: "round" }}/>
                  <text fontFamily="system-ui,-apple-system,'Helvetica Neue',Arial,sans-serif" fontSize="27" fontWeight="800" letterSpacing="-0.8">
                    <tspan x="50" y="31" fill="white">Nutri</tspan><tspan fill="#DEE660">Lens</tspan>
                  </text>
                </svg>
              </div>

              <p
                style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 14,
                  color: "rgba(255,255,255,0.65)",
                  lineHeight: 1.7, maxWidth: 230, marginBottom: 24,
                }}
              >
                AI powered nutrition meets human expertise. Your health transformation
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
            © 2026 NutriLens. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
