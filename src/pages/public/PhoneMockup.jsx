import { Utensils, Scan } from "lucide-react";
import { C } from "./constants/tokens";

export default function PhoneMockup({ size = "small" }) {
  const w      = size === "large" ? 280 : 220;
  const h      = size === "large" ? 560 : 440;
  const radius = size === "large" ? 40  : 36;
  const inner  = size === "large" ? 32  : 30;

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
          <div style={{ padding: "16px 16px 10px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 15, color: C.white }}>
              Today's Log
            </div>
            {/* lime calorie label */}
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.lime, marginTop: 2 }}>
              1,840 / 2,100 kcal
            </div>
          </div>

          {/* Scan area */}
          <div
            style={{
              width: "100%", height: "44%",
              background: "linear-gradient(135deg, #1a3d20 0%, #0d2412 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              position: "relative",
            }}
          >
            <Utensils size={38} color="rgba(222,230,96,0.25)" />

            {/* Lime scanning ring — accent, not bg */}
            <div
              style={{
                position: "absolute", inset: "20%",
                border: `3px solid ${C.lime}`,
                borderRadius: "50%",
                animation: "pulse-ring 2s infinite",
              }}
            >
              <div
                style={{
                  position: "absolute", top: "50%", left: "50%",
                  transform: "translate(-50%,-50%)",
                  width: 7, height: 7, background: C.lime, borderRadius: "50%",
                }}
              />
            </div>

            {/* Corner brackets */}
            {[
              { top:"0%",   left:"0%",   bt:true,  bb:false, bl:true,  br:false },
              { top:"0%",   left:"100%", bt:true,  bb:false, bl:false, br:true  },
              { top:"100%", left:"0%",   bt:false, bb:true,  bl:true,  br:false },
              { top:"100%", left:"100%", bt:false, bb:true,  bl:false, br:true  },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  position: "absolute", top: s.top, left: s.left,
                  width: 16, height: 16,
                  borderTop:    s.bt ? `3px solid ${C.lime}` : "none",
                  borderBottom: s.bb ? `3px solid ${C.lime}` : "none",
                  borderLeft:   s.bl ? `3px solid ${C.lime}` : "none",
                  borderRight:  s.br ? `3px solid ${C.lime}` : "none",
                }}
              />
            ))}
          </div>

          {/* Analysis result */}
          <div style={{ padding: "10px 14px" }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 12, color: C.lime, marginBottom: 2 }}>
              Buddha Bowl Detected
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
              Confidence: 98.4%
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 10 }}>
              {[
                ["Calories","420 kcal", C.lime],
                ["Protein", "18g",      "#7dd3fc"],
                ["Carbs",   "52g",      "#fbbf24"],
                ["Fat",     "14g",      "#f9a8d4"],
              ].map(([label, value, color]) => (
                <div key={label} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "5px 8px" }}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, color: "rgba(255,255,255,0.45)" }}>{label}</div>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 12, color }}>{value}</div>
                </div>
              ))}
            </div>

            <button
              style={{
                width: "100%", background: C.tomato, border: "none",
                borderRadius: 10, padding: "9px",
                fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 12,
                color: C.white, display: "flex", alignItems: "center",
                justifyContent: "center", gap: 5, cursor: "pointer",
              }}
            >
              <Scan size={12} /> Snap a Meal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
