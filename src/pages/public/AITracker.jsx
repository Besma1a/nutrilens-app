import { motion } from "framer-motion";
import { Scan, Target, Brain, TrendingDown } from "lucide-react";
import { C, AI_FEATURES } from "./constants/tokens";
import FadeUp from "./FadeUp";

const ICON_MAP = [Scan, Target, Brain, TrendingDown];

function TrackerPhone() {
  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          width: 280, height: 560,
          background: C.forest,
          borderRadius: 40, padding: 8,
          boxShadow: "0 24px 48px rgba(43,87,38,0.2)",
        }}
      >
        <div
          style={{
            width: "100%", height: "100%",
            background: "#0a1a0e",
            borderRadius: 32, overflow: "hidden", position: "relative",
          }}
        >
          {/* App header */}
          <div style={{ padding: "20px 20px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 18, color: C.white }}>
              Today's Log
            </div>
            {/* lime as a small data label accent */}
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.lime, marginTop: 2 }}>
              1,840 / 2,100 kcal
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ padding: "12px 20px 0" }}>
            <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3 }}>
              <div
                style={{
                  width: "87%", height: "100%",
                  /* lime-to-orange gradient bar — lime as decorative accent */
                  background: `linear-gradient(90deg, ${C.lime}, ${C.ochre})`,
                  borderRadius: 3,
                }}
              />
            </div>
          </div>

          <div style={{ padding: "12px 20px" }}>
            {/* Featured meal */}
            <div
              style={{
                background: "rgba(255,255,255,0.05)", borderRadius: 16, padding: 16, marginBottom: 10,
                border: `1px solid rgba(222,230,96,0.2)`, /* subtle lime border accent */
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 14, color: C.white }}>
                  Buddha Bowl
                </div>
                {/* lime calorie label */}
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.lime, fontWeight: 600 }}>
                  420 kcal
                </div>
              </div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, marginBottom: 8 }}>
                <div style={{ width: "65%", height: "100%", background: C.lime, borderRadius: 2 }} />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                {[["P","18g","#7dd3fc"],["C","52g","#fbbf24"],["F","14g","#f9a8d4"]].map(([l,v,col]) => (
                  <span key={l} style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: col }}>
                    {l}: {v}
                  </span>
                ))}
              </div>
            </div>

            {[
              ["Green Smoothie",       "186 kcal", "8:30 AM"],
              ["Grilled Chicken Wrap", "580 kcal", "12:45 PM"],
              ["Almonds (30g)",        "174 kcal", "3:00 PM"],
            ].map(([name, cal, time]) => (
              <div
                key={name}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.white }}>{name}</div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.38)" }}>{time}</div>
                </div>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.65)" }}>
                  {cal}
                </div>
              </div>
            ))}
          </div>

          <div style={{ position: "absolute", bottom: 20, left: 20, right: 20 }}>
            <button
              style={{
                width: "100%", background: C.tomato, border: "none",
                borderRadius: 16, padding: "12px",
                fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 14,
                color: C.white, display: "flex", alignItems: "center",
                justifyContent: "center", gap: 8, cursor: "pointer",
              }}
            >
              <Scan size={16} /> Snap a Meal
            </button>
          </div>
        </div>
      </div>

      {/* Floating chip — lime as a small badge accent */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2.5, repeat: Infinity }}
        style={{
          position: "absolute", top: 40, right: -28,
          background: C.lime, borderRadius: 12, padding: "8px 14px",
        }}
      >
        <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 12, color: C.forest }}>
          98.4% accurate
        </div>
      </motion.div>
    </div>
  );
}

export default function AITracker() {
  return (
    /* warm neutral bg — NOT lime */
    <section id="ai-tracker" style={{ background: C.bg, padding: "80px 24px" }}>
      <div
        className="ai-grid"
        style={{
          maxWidth: 1200, margin: "0 auto",
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 64, alignItems: "center",
        }}
      >
        <div>
          <FadeUp>
            <div
              style={{
                fontFamily: "'Outfit', sans-serif", fontWeight: 700,
                fontSize: 13, color: C.tomato,
                letterSpacing: 3, textTransform: "uppercase", marginBottom: 12,
              }}
            >
              Powered by Vision AI
            </div>
            <h2
              style={{
                fontFamily: "'Outfit', sans-serif", fontWeight: 800,
                fontSize: "clamp(28px, 4vw, 48px)", color: C.forest,
                margin: "0 0 8px", lineHeight: 1.1,
              }}
            >
              AI Calorie Tracker
            </h2>
            <div
              style={{
                fontFamily: "'Outfit', sans-serif", fontWeight: 700,
                fontSize: 22, color: C.tomato, marginBottom: 36,
              }}
            >
              Snap, Know, Thrive.
            </div>
          </FadeUp>

          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {AI_FEATURES.map((feature, i) => {
              const Icon = ICON_MAP[i];
              return (
                <FadeUp key={i} delay={i * 0.1}>
                  <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                    {/* Forest icon box with lime icon — lime as small accent */}
                    <div
                      style={{
                        width: 44, height: 44,
                        background: C.forest,
                        borderRadius: 12,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={20} color={C.lime} />
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 17, color: C.forest, marginBottom: 4 }}>
                        {feature.title}
                      </div>
                      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "rgba(43,87,38,0.65)", lineHeight: 1.6 }}>
                        {feature.desc}
                      </div>
                    </div>
                  </div>
                </FadeUp>
              );
            })}
          </div>
        </div>

        <FadeUp delay={0.2}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <TrackerPhone />
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
