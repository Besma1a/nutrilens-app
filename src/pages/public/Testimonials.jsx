import { motion } from "framer-motion";
import { Star, TrendingDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { testimonialsApi } from "../../services/api";
import { C } from "./constants/tokens";
import FadeUp from "./FadeUp";

const AVATAR_COLORS = [C.tomato, C.forest, C.ochre, "#4a8040", "#7c6ba0", C.tomato];

function TestimonialCard({ t, index }) {
  return (
    <div
      style={{
        width: 290, flexShrink: 0,
        /* white card on warm bg — clean and bright */
        background: C.white,
        borderRadius: 20, padding: "24px 22px", marginRight: 20,
        border: `1px solid rgba(43,87,38,0.08)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div
          style={{
            width: 42, height: 42, borderRadius: "50%",
            background: AVATAR_COLORS[index % AVATAR_COLORS.length],
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 14,
            color: C.white, flexShrink: 0,
          }}
        >
          {t.avatar}
        </div>
        <div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 14, color: C.forest }}>
            {t.name}
          </div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "rgba(43,87,38,0.5)" }}>
            {t.role}
          </div>
        </div>
      </div>

      {/* Result badge — lime as a small highlight chip */}
      <div
        style={{
          background: C.lime,
          borderRadius: 12, padding: "7px 12px", marginBottom: 14,
          display: "flex", alignItems: "center", gap: 6,
        }}
      >
        <TrendingDown size={14} color={C.forest} />
        <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 13, color: C.forest }}>
          {t.result}
        </span>
      </div>

      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "rgba(43,87,38,0.7)", lineHeight: 1.65, margin: 0 }}>
        "{t.text}"
      </p>

      {/* Orange stars — not lime here for variety */}
      <div style={{ display: "flex", gap: 2, marginTop: 14 }}>
        {[1,2,3,4,5].map((s) => (
          <Star key={s} size={11} fill={C.ochre} color={C.ochre} />
        ))}
      </div>
    </div>
  );
}

export default function Testimonials() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let active = true;
    testimonialsApi
      .listApproved()
      .then((data) => {
        if (!active) return;
        const normalized = (data?.testimonials || []).map((t) => ({
          ...t,
          avatar: String(t.name || "A")
            .split(" ")
            .slice(0, 2)
            .map((part) => part[0] || "")
            .join("")
            .toUpperCase(),
          role: t.plan || "Member",
          result: t.featured ? "Featured Story" : "Member Story",
        }));
        setItems(normalized);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const source = useMemo(() => {
    if (!items.length) return [];
    const featured = items.filter((item) => item.featured);
    return (featured.length ? featured : items).slice(0, 8);
  }, [items]);

  const doubled = [...source, ...source];

  if (!source.length) return null;

  return (
    /* warm neutral bg — NOT lime */
    <section style={{ background: C.bg, padding: "128px 0 80px", marginTop: "48px", overflow: "hidden" }}>
      <FadeUp>
        <div style={{ textAlign: "center", marginBottom: 48, padding: "0 24px" }}>
          <div
            style={{
              fontFamily: "'Outfit', sans-serif", fontWeight: 700,
              fontSize: 13, color: C.tomato,
              letterSpacing: 3, textTransform: "uppercase", marginBottom: 12,
            }}
          >
            Real Results
          </div>
          <h2
            style={{
              fontFamily: "'Outfit', sans-serif", fontWeight: 800,
              fontSize: "clamp(28px, 4vw, 44px)", color: C.forest, margin: 0,
            }}
          >
            What Members Are Saying
          </h2>
          <div style={{ marginTop: 20 }}>
            <Link
              to="/testimonials"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "10px 18px",
                borderRadius: 999,
                border: `1px solid ${C.forest}`,
                color: C.forest,
                textDecoration: "none",
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: 0.3,
                transition: "all 0.2s ease",
              }}
            >
              View All Testimonials
            </Link>
          </div>
        </div>
      </FadeUp>

      <div style={{ overflow: "hidden", position: "relative" }}>
        {/* Fade edges using warm neutral */}
        <div
          style={{
            position: "absolute", left: 0, top: 0, bottom: 0, width: 100,
            background: `linear-gradient(to right, ${C.bg}, transparent)`,
            zIndex: 2, pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute", right: 0, top: 0, bottom: 0, width: 100,
            background: `linear-gradient(to left, ${C.bg}, transparent)`,
            zIndex: 2, pointerEvents: "none",
          }}
        />

        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 30, ease: "linear", repeat: Infinity }}
          style={{ display: "flex", padding: "8px 0 16px" }}
        >
          {doubled.map((t, i) => (
            <TestimonialCard key={i} t={t} index={i % source.length} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}