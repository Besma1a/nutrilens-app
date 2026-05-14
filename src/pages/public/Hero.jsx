import { useEffect, useState } from "react";
import { ArrowRight, Star, TrendingDown } from "lucide-react";

const MEDIA_BASE = `${window.location.protocol}//${window.location.hostname}:8000/media`;
import { motion } from "framer-motion";
import { C } from "./constants/tokens";
import FadeUp from "./FadeUp";
import PhoneMockup from "./PhoneMockup";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { publicApi } from "../../services/api";

const FALLBACK_AVATARS = [
  { initial: "A", color: C.tomato },
  { initial: "B", color: "#F19335" },
  { initial: "C", color: "#2B5726" },
  { initial: "D", color: "#4a8040" },
];

export default function Hero() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [memberCount, setMemberCount] = useState(null);
  const [avatars, setAvatars] = useState(FALLBACK_AVATARS);

  useEffect(() => {
    publicApi.stats().then((data) => {
      if (!data) return;
      if (typeof data.member_count === "number") setMemberCount(data.member_count);
      if (Array.isArray(data.recent_avatars) && data.recent_avatars.length > 0) {
        setAvatars(data.recent_avatars);
      }
    });
  }, []);

  const formatCount = (n) => {
    if (n === null) return "12,000+";
    if (n >= 1000) return `${(n / 1000).toFixed(0)}k+`;
    return `${n}+`;
  };

  const handleGetStarted = (e) => {
    e.preventDefault();
    navigate(user ? "/user/dashboard" : "/register");
  };

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
          padding: "15px 24px", width: "100%",
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
              Connect with world class dietitians and let our AI do the heavy
              lifting, Track every meal with a single snap.
            </p>
          </FadeUp>

          <FadeUp delay={0.3}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a
                href={user ? "/user/dashboard" : "/register"}
                onClick={handleGetStarted}
                style={{
                  background: C.tomato, color: C.white, border: "none",
                  borderRadius: 20, padding: "14px 28px",
                  fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 8,
                  textDecoration: "none", cursor: "pointer",
                }}
              >
                Get Started Free <ArrowRight size={16} />
              </a>
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
                {avatars.slice(0, 4).map((av, i) => (
                  <div
                    key={i}
                    style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: av.color, border: `2px solid ${C.bg}`,
                      marginLeft: i > 0 ? -10 : 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 11, color: "#fff" }}>
                      {av.initial}
                    </span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ display: "flex", gap: 2, marginBottom: 2 }}>
                  {[1,2,3,4,5].map((s) => <Star key={s} size={12} fill={C.ochre} color={C.ochre} />)}
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "rgba(43,87,38,0.65)" }}>
                  {formatCount(memberCount)} happy members
                </div>
              </div>
            </div>
          </FadeUp>
        </div>

        {/* ── Right: Rotated phones ── */}
        <FadeUp delay={0.2} className="hero-right">
          {/*
            Absolute positioning lets us spread the phones to left/right edges so
            their bounding boxes have a small gap — only the rotated bottom corners
            reach toward each other. Using flex caused the tops to cross heavily.
          */}
          <div style={{ position: "relative", height: 560 }}>

            {/* Floating chip */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute", top: 16, left: "50%",
                transform: "translateX(-50%)", zIndex: 10,
                background: C.lime, borderRadius: 16,
                padding: "8px 14px", display: "flex", alignItems: "center",
                gap: 6, whiteSpace: "nowrap",
              }}
            >
              <TrendingDown size={14} color={C.forest} />
              <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 13, color: C.forest }}>
                −5.4 kg in 60 days
              </span>
            </motion.div>

            {/* Nutritionist card — left side, behind */}
            <div
              className="phone-tilt-left"
              style={{
                position: "absolute", left: "3%", top: "52%",
                transform: "rotate(-9deg) translateY(-52%)",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  width: 250, height: 470,
                  borderRadius: 28, overflow: "hidden", position: "relative",
                  boxShadow: "0 16px 48px rgba(0,0,0,0.22)",
                }}
              >
                <img
                  src={`${MEDIA_BASE}/profile_pictures/drhadil.png`}
                  alt="Hadil Zidouri"
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }}
                />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "52%", background: `linear-gradient(180deg, transparent, ${C.forest})` }} />
                <div style={{ position: "absolute", bottom: 22, left: 18, right: 18 }}>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 15, color: C.white }}>
                    Dr.Hadil Zidouri
                  </div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
                    Clinical Nutritionist · NutriLens
                  </div>
                  <div style={{ display: "flex", gap: 2, marginTop: 6 }}>
                    {[1,2,3,4,5].map((s) => <Star key={s} size={10} fill={C.lime} color={C.lime} />)}
                  </div>
                </div>
              </div>
            </div>

            {/* Phone mockup — right side, front */}
            <div
              className="phone-tilt-right"
              style={{
                position: "absolute", right: "3%", top: "48%",
                transform: "rotate(9deg) translateY(-48%)",
                zIndex: 2,
              }}
            >
              <PhoneMockup size="small" />
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
