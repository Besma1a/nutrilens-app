import { ArrowRight, Star, TrendingDown, Users } from "lucide-react";
import { motion } from "framer-motion";
import { C } from "./constants/tokens";
import FadeUp from "./FadeUp";
import PhoneMockup from "./PhoneMockup";
import { Link } from "react-router-dom";

export default function Hero() {
  return (
    <section
      className="hero-section"
      style={{
        background: C.white,
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Decorative blobs */}
      <div
        style={{
          position: "absolute", right: -100, top: -100,
          width: 520, height: 520,
          background: C.lime, opacity: 0.18,
          borderRadius: "50%", filter: "blur(90px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute", left: -60, bottom: -80,
          width: 380, height: 380,
          background: C.tomato, opacity: 0.06,
          borderRadius: "50%", filter: "blur(70px)",
          pointerEvents: "none",
        }}
      />

      <div
        className="hero-grid"
        style={{
          maxWidth: 1200, margin: "0 auto",
          padding: "40px 24px", width: "100%",
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 48, alignItems: "center",
        }}
      >
        {/* ── Left copy ── */}
        <div>
          <FadeUp delay={0}>
            {/* Lime badge chip */}
            <div
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: C.lime, borderRadius: 999,
                padding: "5px 14px", marginBottom: 22,
              }}
            >
              <span style={{ width: 7, height: 7, background: C.forest, borderRadius: "50%", display: "inline-block" }} />
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.forest, fontWeight: 700 }}>
                AI-Powered Nutrition Platform
              </span>
            </div>
          </FadeUp>

          <FadeUp delay={0.1}>
            <h1
              style={{
                fontFamily: "'Outfit', sans-serif", fontWeight: 800,
                fontSize: "clamp(32px, 4vw, 52px)", color: C.forest,
                lineHeight: 1.1, margin: "0 0 20px", letterSpacing: "-1px",
              }}
            >
              Global Expertise.
              <br />
              {/* Version 2 exact: "AI Precision." is RED, plain — no bg highlight */}
              <span style={{ color: C.tomato }}>AI Precision.</span>
              <br />
              Your Best Self.
            </h1>
          </FadeUp>

          <FadeUp delay={0.2}>
            <p
              style={{
                fontFamily: "'Inter', sans-serif", fontSize: 17,
                color: "rgba(43,87,38,0.72)", lineHeight: 1.7,
                marginBottom: 32, maxWidth: 440,
              }}
            >
              Connect with world-class dietitians and let our AI do the heavy
              lifting—track every meal with a single snap.
            </p>
          </FadeUp>

          <FadeUp delay={0.3}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link
                to="/register"
                style={{
                  background: C.tomato, color: C.white, border: "none",
                  borderRadius: 20, padding: "14px 28px",
                  fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 8,
                  textDecoration: "none",
                }}
              >
                Get Started Free <ArrowRight size={16} />
              </Link>
              <Link
                to="/nutritionists"
                style={{
                  background: "none", color: C.forest,
                  border: `2px solid ${C.forest}`,
                  borderRadius: 20, padding: "14px 28px",
                  fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 600,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                Meet Our Experts
              </Link>
            </div>
          </FadeUp>

          <FadeUp delay={0.4}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 32 }}>
              <div style={{ display: "flex" }}>
                {[C.tomato, C.ochre, C.forest, "#4a8040"].map((color, i) => (
                  <div
                    key={i}
                    style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: color, border: `2px solid ${C.bg}`,
                      marginLeft: i > 0 ? -10 : 0,
                    }}
                  />
                ))}
              </div>
              <div>
                <div style={{ display: "flex", gap: 2, marginBottom: 2 }}>
                  {[1,2,3,4,5].map((s) => <Star key={s} size={12} fill={C.ochre} color={C.ochre} />)}
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "rgba(43,87,38,0.65)" }}>
                  12,000+ happy members
                </div>
              </div>
            </div>
          </FadeUp>
        </div>

        {/* ── Right: Rotated phones ── */}
        <FadeUp delay={0.2} className="hero-right">
          <div style={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center", height: 480 }}>

            {/* Dietitian card — tilted left, behind */}
            <div
              className="phone-tilt-left"
              style={{
                position: "absolute", left: "8%", top: "50%",
                transform: "rotate(-8deg) translateY(-50%) translateX(-10px)",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  width: 180, height: 360,
                  background: `linear-gradient(180deg, ${C.cream} 0%, #e8dca0 100%)`,
                  borderRadius: 20, overflow: "hidden", position: "relative",
                }}
              >
                <Users size={80} color={C.forest} style={{ opacity: 0.15, position: "absolute", top: "30%", left: "50%", transform: "translateX(-50%)" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60%", background: `linear-gradient(180deg, transparent, ${C.forest})` }} />
                <div style={{ position: "absolute", bottom: 16, left: 16, right: 16 }}>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 14, color: C.white }}>
                    Dr. Amara Diallo
                  </div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
                    Registered Dietitian · 8 yrs
                  </div>
                  <div style={{ display: "flex", gap: 2, marginTop: 4 }}>
                    {[1,2,3,4,5].map((s) => <Star key={s} size={9} fill={C.lime} color={C.lime} />)}
                  </div>
                </div>
              </div>
            </div>

            {/* Phone mockup — tilted right, front */}
            <div
              className="phone-tilt-right"
              style={{
                position: "absolute", right: "8%", top: "50%",
                transform: "rotate(8deg) translateY(-50%) translateX(10px)",
                zIndex: 2,
              }}
            >
              <PhoneMockup size="small" />
            </div>

            {/* Floating chip */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute", top: 20, left: "50%",
                transform: "translateX(-50%)", zIndex: 10,
                background: C.lime, borderRadius: 16,
                padding: "8px 14px", display: "flex", alignItems: "center",
                gap: 6, whiteSpace: "nowrap",
              }}
            >
              <TrendingDown size={14} color={C.forest} />
              <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 13, color: C.forest }}>
                −12 lbs in 60 days
              </span>
            </motion.div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
