import { useState } from "react";
import { Check } from "lucide-react";
import { C } from "./constants/tokens";
import FadeUp from "./FadeUp";

const SUBSCRIBE_URL = `${window.location.protocol}//${window.location.hostname}:8000/api/v1/newsletter/subscribe/`;

/**
 * Newsletter is now visually fused with Footer via a shared red background.
 * The wavy SVG divider at the TOP of this component transitions from the white
 * FAQ section above into the red block.
 */
export default function Newsletter() {
  const [email, setEmail]     = useState("");
  const [status, setStatus]   = useState("idle"); // "idle" | "loading" | "done" | "error"
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch(SUBSCRIBE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      if (res.ok) {
        setStatus("done");
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.detail || "Something went wrong. Please try again.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Could not reach the server. Check your connection.");
      setStatus("error");
    }
  };

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
                background: C.ochre,
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
                color: C.lime,
                margin: "0 0 14px", lineHeight: 1.15,
              
              }}
            >
              Nutrition science,{" "}
              <span style={{ color: C.white }}>delivered weekly.</span>
            </h2>

           

            {status === "done" ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 40 }}>
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
            ) : (
              <>
                <div
                  style={{
                    display: "flex", maxWidth: 500, margin: "40px auto 0 auto",
                    background: "#FEF8E0",
                    borderRadius: 999,
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
                    disabled={status === "loading"}
                    style={{
                      flex: 1, padding: "15px 24px",
                      border: "none", background: "transparent",
                      fontFamily: "'Inter', sans-serif", fontSize: 15,
                      color: C.forest, outline: "none",
                      opacity: status === "loading" ? 0.6 : 1,
                    }}
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={status === "loading"}
                    style={{
                      background: C.ochre, color: C.white,
                      border: "none", padding: "15px 28px",
                      fontFamily: "'Outfit', sans-serif", fontSize: 15,
                      fontWeight: 700, flexShrink: 0,
                      borderRadius: 999,
                      cursor: status === "loading" ? "not-allowed" : "pointer",
                      margin: 4,
                      opacity: status === "loading" ? 0.7 : 1,
                    }}
                  >
                    {status === "loading" ? "Subscribing…" : "Subscribe →"}
                  </button>
                </div>
                {status === "error" && (
                  <p style={{
                    marginTop: 12, fontFamily: "'Inter', sans-serif",
                    fontSize: 13, color: "#ffe4e4", fontWeight: 500,
                  }}>
                    {errorMsg}
                  </p>
                )}
              </>
            )}
          </div>
        </FadeUp>
      </div>
    </div>
  );
}
