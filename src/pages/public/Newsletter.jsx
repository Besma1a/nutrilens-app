import { useState } from "react";
import { Check } from "lucide-react";
import { C } from "./constants/tokens";
import FadeUp from "./FadeUp";

/**
 * Newsletter is now visually fused with Footer via a shared red background.
 * The wavy SVG divider at the TOP of this component transitions from the white
 * FAQ section above into the red block.
 */
export default function Newsletter() {
  const [email, setEmail]         = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit  = () => { if (email.trim()) setSubmitted(true); };
  const handleKeyDown = (e) => { if (e.key === "Enter") handleSubmit(); };

  return (
    /* Outer wrapper — starts with the wave, continues into red */
    <div style={{ background: C.tomato, marginTop: 0 }}>

      {/* ── Wavy SVG divider ─────────────────────────────────────────
          Top colour = white (FAQ bottom)
          Bottom colour = red (this section)
          The SVG path creates an organic wave cutting across             */}
      <div style={{ lineHeight: 0, display: "block", marginBottom: -2 }}>
        <svg
          viewBox="0 0 1440 100"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          style={{ width: "100%", height: "clamp(60px, 8vw, 100px)", display: "block" }}
        >
          {/* White wave shape sitting on top of the red background */}
          <path
            d="M0,0 L0,60 Q180,100 360,60 Q540,20 720,60 Q900,100 1080,60 Q1260,20 1440,60 L1440,0 Z"
            fill="#ffffff"
          />
        </svg>
      </div>

      {/* ── Newsletter content ────────────────────────────────────── */}
      <div style={{ padding: "56px 24px 64px" }}>
        <FadeUp>
          <div style={{ maxWidth: 620, margin: "0 auto", textAlign: "center" }}>

            {/* Eyebrow — green on red = high contrast, vibrant */}
            <div
              style={{
                display: "inline-block",
                background: C.lime,
                borderRadius: 999, padding: "4px 16px",
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 700, fontSize: 12,
                color: C.forest, letterSpacing: 2,
                textTransform: "uppercase", marginBottom: 18,
              }}
            >
              Stay in the Know
            </div>

            <h2
              style={{
                fontFamily: "'Outfit', sans-serif", fontWeight: 800,
                fontSize: "clamp(26px, 3vw, 42px)",
                /* green on red = bold, fun, high contrast */
                color: C.forest,
                margin: "0 0 14px", lineHeight: 1.15,
              }}
            >
              Nutrition science,{" "}
              <span style={{ color: C.white }}>delivered weekly.</span>
            </h2>

            <p
              style={{
                fontFamily: "'Inter', sans-serif", fontSize: 16,
                color: "rgba(255,255,255,0.75)",
                marginBottom: 36, lineHeight: 1.6,
              }}
            >
              No spam. Just research-backed tips, recipe ideas, and platform updates.
            </p>

            {!submitted ? (
              <div
                style={{
                  display: "flex", maxWidth: 500, margin: "0 auto",
                  /* off-white input bg */
                  background: "#FEF8E0",
                  borderRadius: 999,           /* fully rounded pill */
                  overflow: "hidden",
                  border: "none",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                }}
              >
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  style={{
                    flex: 1, padding: "15px 24px",
                    border: "none", background: "transparent",
                    fontFamily: "'Inter', sans-serif", fontSize: 15,
                    color: C.forest, outline: "none",
                  }}
                />
                {/* Orange CTA button */}
                <button
                  onClick={handleSubmit}
                  style={{
                    background: C.ochre, color: C.white,
                    border: "none", padding: "15px 28px",
                    fontFamily: "'Outfit', sans-serif", fontSize: 15,
                    fontWeight: 700, flexShrink: 0,
                    borderRadius: 999,
                    cursor: "pointer",
                    margin: 4,
                  }}
                >
                  Subscribe →
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <div
                  style={{
                    width: 34, height: 34, borderRadius: "50%",
                    background: C.lime,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Check size={18} color={C.forest} />
                </div>
                <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 18, color: C.white }}>
                  You're in! Welcome to the community.
                </span>
              </div>
            )}
          </div>
        </FadeUp>
      </div>
    </div>
  );
}
