import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { C, DIET_PLANS } from "./constants/tokens";
import FadeUp from "./FadeUp";

function PlanCard({ plan }) {
  return (
    <div style={{ borderRadius: 20, overflow: "hidden", background: plan.color, position: "relative", minHeight: 400 }}>
      <div style={{ fontSize: 110, textAlign: "center", paddingTop: 44, lineHeight: 1, filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.2))" }}>
        {plan.emoji}
      </div>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 28%, rgba(0,0,0,0.85) 100%)" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 24px 24px" }}>
        <div
          style={{
            display: "inline-block", background: C.lime,
            borderRadius: 999, padding: "3px 12px",
            fontFamily: "'Inter', sans-serif", fontSize: 11,
            fontWeight: 700, color: C.forest, marginBottom: 10,
          }}
        >
          {plan.tag}
        </div>
        <h3 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 26, color: C.white, margin: "0 0 8px", lineHeight: 1.1 }}>
          {plan.name}
        </h3>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.72)", margin: "0 0 14px", lineHeight: 1.55 }}>
          {plan.desc}
        </p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
          {plan.badges.map((badge) => (
            <span key={badge} style={{ background: "rgba(255,255,255,0.14)", borderRadius: 999, padding: "3px 10px", fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.85)" }}>
              {badge}
            </span>
          ))}
        </div>
        <Link
          to={`/diet/${plan.id}`}
          style={{
            background: C.tomato, color: C.white, border: "none",
            borderRadius: 20, padding: "10px 22px",
            fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600,
            display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
            textDecoration: "none",
          }}
        >
          Explore Plan <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}

export default function DietPlans() {
  return (
    /* Clean near-white gradient — no yellow/beige */
    <section style={{ background: "linear-gradient(to bottom, #ffffff, #f8fafc)", padding: "80px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 13, color: C.tomato, letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 }}>
              Evidence-Based
            </div>
            <div style={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: "clamp(28px, 4vw, 44px)", color: C.forest, margin: 0 }}>
                Diet Plans
              </h2>
              <Link to="/diet" style={{ position: "absolute", right: 80, bottom: -5, fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 600, color: C.tomato, textDecoration: "none" }}>
                See more →
              </Link>
            </div>
            
          </div>
        </FadeUp>
        <div className="plans-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {DIET_PLANS.map((plan, i) => (
            <FadeUp key={i} delay={i * 0.1}>
              <PlanCard plan={plan} />
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
