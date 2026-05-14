import { Scan } from "lucide-react";
import { C } from "./constants/tokens";

const MEDIA_BASE = `${window.location.protocol}//${window.location.hostname}:8000/media`;

export default function PhoneMockup({ size = "small" }) {
  const w      = size === "large" ? 280 : 250;
  const h      = size === "large" ? 560 : 470;
  const radius = size === "large" ? 40  : 38;
  const inner  = size === "large" ? 32  : 32;

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {/* Phone shell — forest green */}
      <div
        style={{
          width: w, height: h,
          background: C.forest, borderRadius: radius, padding: 6,
          boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.12)",
        }}
      >
        <div
          style={{
            width: "100%", height: "100%",
            background: "#0a1a0e", borderRadius: inner,
            overflow: "hidden", position: "relative",
          }}
        >
          {/* Header */}
          <div style={{ padding: "12px 14px 8px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 14, color: C.white }}>
              Today's Log
            </div>
            {/* lime calorie label */}
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: C.lime, marginTop: 2 }}>
              1,840 / 2,100 kcal
            </div>
          </div>

          {/* Scan area — Buddha Bowl photo with scan UI overlay */}
          <div
            style={{
              width: "100%", height: "38%",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Food photo */}
            <img
              src={`${MEDIA_BASE}/buddha-bowl.jpg`}
              alt="Buddha Bowl"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />

            {/* Dark tint so scan UI stays readable over the photo */}
            <div style={{ position: "absolute", inset: 0, background: "rgba(10,26,14,0.40)" }} />

            {/* Scanning ring */}
            <div
              style={{
                position: "absolute", inset: "18%",
                border: `2.5px solid ${C.lime}`,
                borderRadius: "50%",
                animation: "pulse-ring 2s infinite",
              }}
            >
              <div
                style={{
                  position: "absolute", top: "50%", left: "50%",
                  transform: "translate(-50%,-50%)",
                  width: 6, height: 6, background: C.lime, borderRadius: "50%",
                }}
              />
            </div>

            {/* Corner brackets — anchored to edges so they never overflow */}
            {[
              { top: "5px",  left: "5px",  bt:true,  bb:false, bl:true,  br:false },
              { top: "5px",  right:"5px",  bt:true,  bb:false, bl:false, br:true  },
              { bottom:"5px",left: "5px",  bt:false, bb:true,  bl:true,  br:false },
              { bottom:"5px",right:"5px",  bt:false, bb:true,  bl:false, br:true  },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: s.top, left: s.left, right: s.right, bottom: s.bottom,
                  width: 14, height: 14,
                  borderTop:    s.bt ? `2.5px solid ${C.lime}` : "none",
                  borderBottom: s.bb ? `2.5px solid ${C.lime}` : "none",
                  borderLeft:   s.bl ? `2.5px solid ${C.lime}` : "none",
                  borderRight:  s.br ? `2.5px solid ${C.lime}` : "none",
                }}
              />
            ))}
          </div>

          {/* Analysis result */}
          <div style={{ padding: "8px 12px 14px" }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 11, color: C.lime, marginBottom: 1 }}>
              Buddha Bowl Detected
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, color: "rgba(255,255,255,0.5)", marginBottom: 7 }}>
              Confidence: 98.4%
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 9 }}>
              {[
                ["Calories","420 kcal", C.lime],
                ["Protein", "18g",      "#7dd3fc"],
                ["Carbs",   "52g",      "#fbbf24"],
                ["Fat",     "14g",      "#f9a8d4"],
              ].map(([label, value, color]) => (
                <div key={label} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 7, padding: "4px 7px" }}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 8, color: "rgba(255,255,255,0.45)" }}>{label}</div>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 11, color }}>{value}</div>
                </div>
              ))}
            </div>

            <button
              style={{
                width: "100%", background: C.tomato, border: "none",
                borderRadius: 9, padding: "8px",
                fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 11,
                color: C.white, display: "flex", alignItems: "center",
                justifyContent: "center", gap: 5, cursor: "pointer",
              }}
            >
              <Scan size={11} /> Snap a Meal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
