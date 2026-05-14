import { useState } from "react";
import { motion } from "framer-motion";
import Header from "./Header";
import Footer from "./Footer";
import WaveToFooter from "./WaveToFooter";
import FadeUp from "./FadeUp";
import { C } from "./constants/tokens";
import { Link } from "react-router-dom";

// ── Font import + responsive CSS ──────────────────────────────────
const _styles = (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,800;0,9..144,900;1,9..144,700;1,9..144,800&family=DM+Sans:wght@400;500;600;700&display=swap');

    .about-problem-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 72px;
      align-items: center;
    }

    .about-mv-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    .about-team-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 28px;
    }

    .about-stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      padding-top: 32px;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
    }

    .about-cta-btns {
      display: flex;
      gap: 16px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .about-hero-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 64px;
      align-items: center;
    }

    
    .about-cta-primary-dark {
      display: inline-block;
      font-family: 'DM Sans', sans-serif;
      font-weight: 700;
      font-size: 15px;
      color: #ffffff;
      background: #A50C05;
      padding: 14px 32px;
      border-radius: 999px;
      text-decoration: none;
      letter-spacing: 0.02em;
      box-shadow: 3px 3px 0 #2B5726;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .about-cta-primary-dark:hover {
      transform: translate(-2px, -2px);
      box-shadow: 5px 5px 0 #2B5726;
    }

    .about-cta-secondary-dark {
      display: inline-block;
      font-family: 'DM Sans', sans-serif;
      font-weight: 600;
      font-size: 15px;
      color: #2B5726;
      padding: 14px 32px;
      border-radius: 999px;
      text-decoration: none;
      border: 1.5px solid #2B5726;
      transition: background 0.2s ease, color 0.2s ease;
    }
    .about-cta-secondary-dark:hover {
      background: #2B5726;
      color: #ffffff;
    }

    @media (max-width: 900px) {
      .about-hero-grid {
        grid-template-columns: 1fr;
        gap: 40px;
      }
      .about-problem-grid {
        grid-template-columns: 1fr;
        gap: 48px;
      }
      .about-mv-grid {
        grid-template-columns: 1fr;
      }
      .about-team-grid {
        grid-template-columns: 1fr;
        max-width: 400px;
        margin: 0 auto;
      }
      .about-supervisor-grid {
        grid-template-columns: 1fr !important;
        gap: 40px !important;
      }
    }

    @media (max-width: 600px) {
      .about-stats-grid {
        grid-template-columns: 1fr;
        gap: 32px;
      }
    }
  `}</style>
);


const TEAM = [
  {
    name: "Zidouri Hadil",
    role: "Full-Stack Developer & UI/UX Design ",
    focus:
      "Designed the end-to-end user experience, and architected the full-stack system.",
    initial: "H",
    accent: C.forest,
    rotate: "-2.5deg",
    photo: "/media/profiles/zidouri.jpg",
  },
  {
    name: "Messaoudi Besmala",
    role: " Backend Architecture & AI Integration ",
    focus:
      "Built the AI food-recognition pipeline, integrated the YOLOv8 model.",
    initial: "B",
    accent: C.tomato,
    rotate: "2deg",
    photo: "/media/profiles/messaoudi.jpg",
  },
  {
    name: "Karboua Douaa",
    role: "Full-Stack Developer",
    focus:
      "architected the full-stack system.",
    initial: "D",
    accent: C.ochre,
    rotate: "-1.2deg",
    photo: "/media/profiles/kerboua.jpg",
  },
];

// ── Marquee ───────────────────────────────────────────────────────
const MARQUEE_ITEMS = [
  "COMPUTER VISION",
  "PERSONALIZED NUTRITION",
  "AI-POWERED TRACKING",
  "MADE IN ALGERIA",
  "GRADUATING 2026",
  "NUTRILENS",
  "UNIVERSITY OF CONSTANTINE 2",
  "YOLOV8 MODEL",
  "CERTIFIED NUTRITIONISTS",
];

function Marquee() {
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div
      style={{
        background: C.lime,
        overflow: "hidden",
        padding: "13px 0",
        borderTop: `2.5px solid ${C.forest}`,
        borderBottom: `2.5px solid ${C.forest}`,
      }}
    >
      <motion.div
        style={{ display: "flex", width: "max-content" }}
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
      >
        {items.map((item, i) => (
          <span
            key={i}
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 900,
              fontSize: 12,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: C.forest,
              padding: "0 28px",
              whiteSpace: "nowrap",
            }}
          >
            {item}
            <span style={{ marginLeft: 28, color: C.tomato }}>·</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ── Team card — the design anchor ─────────────────────────────────
// Cards rest at a slight random rotation; on hover they snap to 0°
// and lift with an offset block shadow in the member's accent colour.
function TeamCard({ member, index }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, rotate: member.rotate }}
      whileInView={{ opacity: 1, y: 0, rotate: member.rotate }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.65, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ rotate: "0deg", y: -10, scale: 1.02 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        background: C.white,
        borderRadius: 22,
        padding: "40px 32px",
        border: `2px solid ${C.cream}`,
        boxShadow: hovered
          ? `0 24px 64px rgba(0,0,0,0.13), 5px 5px 0 ${member.accent}`
          : `0 6px 24px rgba(0,0,0,0.07), 4px 4px 0 ${member.accent}`,
        cursor: "default",
        transition: "box-shadow 0.3s ease",
        transformOrigin: "center bottom",
        willChange: "transform",
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 88,
          height: 88,
          borderRadius: "50%",
          background: member.accent,
          border: `3px solid ${C.forest}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
          overflow: "hidden",
        }}
      >
        {member.photo ? (
          <img
            src={member.photo}
            alt={member.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 900,
              fontStyle: "italic",
              fontSize: 36,
              color: C.white,
              lineHeight: 1,
            }}
          >
            {member.initial}
          </span>
        )}
      </div>

      <h3
        style={{
          fontFamily: "'Fraunces', serif",
          fontWeight: 800,
          fontSize: 21,
          color: C.forest,
          margin: "0 0 8px",
          lineHeight: 1.2,
        }}
      >
        {member.name}
      </h3>

      <span
        style={{
          display: "inline-block",
          background: C.bg,
          color: member.accent,
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          padding: "4px 12px",
          borderRadius: 999,
          marginBottom: 16,
          border: `1.5px solid ${member.accent}33`,
        }}
      >
        {member.role}
      </span>

      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 14,
          color: "#5c5c5c",
          lineHeight: 1.75,
          margin: 0,
        }}
      >
        {member.focus}
      </p>
    </motion.div>
  );
}

function StatBlock({ value, label }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontFamily: "'Fraunces', serif",
          fontWeight: 900,
          fontStyle: "italic",
          fontSize: "clamp(36px, 5vw, 58px)",
          color: C.lime,
          lineHeight: 1,
          marginBottom: 10,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 12,
          fontWeight: 500,
          color: "rgba(255,255,255,0.62)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          lineHeight: 1.5,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function FeatureRow({ icon, title, body }) {
  return (
    <div
      style={{
        background: C.bg,
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 16,
        padding: "22px 26px",
        display: "flex",
        gap: 18,
        alignItems: "flex-start",
      }}
    >
      <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>
        {icon}
      </span>
      <div>
        <div
          style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 700,
            fontSize: 16,
            color: "#060606ff",
            marginBottom: 5,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            color: "#4a4a4a",
            lineHeight: 1.7,
          }}
        >
          {body}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────
export default function AboutPage() {
  return (
    <div className="public-page">
      {_styles}
      <Header bg={C.bg} scrolledBg={C.bg} />

      <main style={{ paddingTop: 72 }}>

        {/* ── 1. HERO ───────────────────────────────────────────── */}
        <section
          style={{
            background: C.bg,
            padding: "100px 24px 90px",
            overflow: "hidden",
            position: "relative",
            minHeight: "calc(100vh - 72px)",
            display: "flex",
            alignItems: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -100,
              right: -100,
              width: 440,
              height: 440,
              background: C.lime,
              borderRadius: "70% 30% 50% 50% / 40% 60% 40% 60%",
              opacity: 0.28,
              zIndex: 0,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -80,
              left: -80,
              width: 320,
              height: 320,
              background: C.tomato,
              borderRadius: "40% 60% 70% 30% / 60% 30% 70% 40%",
              opacity: 0.07,
              zIndex: 0,
              pointerEvents: "none",
            }}
          />

          <div
            style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1, width: "100%" }}
          >
            <div className="about-hero-grid">
              {/* Left — headline + subtext */}
              <div>
                <FadeUp delay={0.0}>
                  <h1
                    style={{
                      fontFamily: "'Fraunces', serif",
                      fontWeight: 900,
                      fontSize: "clamp(36px, 5.5vw, 72px)",
                      color: C.forest,
                      lineHeight: 1.06,
                      letterSpacing: "-2px",
                      margin: "0 0 28px",
                    }}
                  >
                    We built NutriLens{" "}
                    <em style={{ color: C.tomato, fontStyle: "italic" }}>because</em>{" "}
                    good nutrition advice should reach everyone.
                  </h1>
                </FadeUp>

               
              </div>

              {/* Right — university credential card */}
              <FadeUp delay={0.22}>
                <div
                  style={{
                    background: C.white,
                    borderRadius: 20,
                    padding: "20px 26px",
                    border: `2px solid ${C.cream}`,
                    boxShadow: `5px 5px 0 ${C.tomato}`,
                    transform: "translate(40px, 130px)",
                    
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: C.forest,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      <span style={{ fontSize: 22 }}>🎓</span>
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: "'Fraunces', serif",
                          fontWeight: 800,
                          fontSize: 15,
                          color: C.forest,
                          lineHeight: 1.3,
                          marginBottom: 4,
                        }}
                      >
                        University of Constantine 2
                      </div>
                      <div
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#4a4a4a",
                          lineHeight: 1.5,
                          marginBottom: 10,
                        }}
                      >
                        Faculty of NTIC · Department IFA
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 10,
                            fontWeight: 700,
                            color: C.tomato,
                            background: `${C.tomato}12`,
                            border: `1px solid ${C.tomato}33`,
                            padding: "3px 9px",
                            borderRadius: 999,
                            letterSpacing: "0.04em",
                          }}
                        >
                          Computer Sciences (SCI)
                        </span>
                        <span
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 10,
                            fontWeight: 700,
                            color: C.forest,
                            background: `${C.forest}12`,
                            border: `1px solid ${C.forest}33`,
                            padding: "3px 9px",
                            borderRadius: 999,
                            letterSpacing: "0.04em",
                          }}
                        >
                          June 2026
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeUp>
            </div>
          </div>
        </section>

       

        {/* ── 3. THE PROBLEM ────────────────────────────────────── */}
        <section style={{ background: C.tomato, padding: "100px 24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div className="about-problem-grid">

              <FadeUp>
                <div>
                  <h2
                    style={{
                      fontFamily: "'Fraunces', serif",
                      fontWeight: 900,
                      fontSize: "clamp(28px, 4vw, 50px)",
                      color: C.white,
                      lineHeight: 1.1,
                      letterSpacing: "-1.5px",
                      margin: "0 0 24px",
                    }}
                  >
                    Nutrition advice is{" "}
                    <em style={{ color: C.lime, fontStyle: "italic" }}>
                      expensive, inaccessible,
                    </em>{" "}
                    and hard to sustain.
                  </h2>

                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 15,
                      color: "rgba(255,255,255,0.75)",
                      lineHeight: 1.85,
                      margin: "0 0 40px",
                      maxWidth: 480,
                    }}
                  >
                    Manually logging every meal is tedious and error-prone. Dietitian
                    consultations are costly and geographically constrained. Most tracking
                    apps demand detailed input that users abandon within days. NutriLens
                    removes these barriers: one photo identifies your food, and a certified
                    expert guides your long-term plan.
                  </p>

                  <div className="about-stats-grid">
                    <StatBlock value="80%" label="of adults track calories inconsistently" />
                    <StatBlock value="2M+" label="foods in the CV model database" />
                    <StatBlock value="< 1s" label="food recognition latency" />
                  </div>
                </div>
              </FadeUp>

              <FadeUp delay={0.15}>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <FeatureRow
                    icon="📸"
                    title="Snap to track"
                    body="Point a camera at any meal. The model identifies food items, estimates portions, and logs macros automatically — no manual entry."
                  />
                  <FeatureRow
                    icon="🧑‍⚕️"
                    title="Connect with an expert"
                    body="Browse certified nutritionists, book a video consultation, and receive a personalised plan built around your actual lifestyle."
                  />
                  <FeatureRow
                    icon="📊"
                    title="Data that works for you"
                    body="Weekly analytics surface trends in your diet — not raw numbers, but actionable guidance your dietitian can act on."
                  />
                </div>
              </FadeUp>

            </div>
          </div>
        </section>

        
        {/* ── 5. TEAM ───────────────────────────────────────────── */}
        <section style={{ background: C.cream, padding: "100px 24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <FadeUp>
              <div style={{ marginBottom: 64 }}>
                <h2
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontWeight: 900,
                    fontSize: "clamp(28px, 4.5vw, 54px)",
                    color: C.forest,
                    letterSpacing: "-2px",
                    margin: 0,
                    lineHeight: 1.08,
                  }}
                >
                  Three developers,{" "}
                  <em style={{ color: C.tomato, fontStyle: "italic" }}>one platform.</em>
                </h2>
              </div>
            </FadeUp>

            <div className="about-team-grid">
              {TEAM.map((member, i) => (
                <TeamCard key={member.name} member={member} index={i} />
              ))}
            </div>
          </div>
        </section>

        <Marquee />

        {/* ── 6. SUPERVISOR ─────────────────────────────────────── */}
        <section style={{ background: C.bg, padding: "88px 24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 64,
                alignItems: "center",
              }}
              className="about-supervisor-grid"
            >
              {/* Left: editorial statement */}
              <FadeUp>
                <h2
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontWeight: 900,
                    fontStyle: "italic",
                    fontSize: "clamp(32px, 4.5vw, 56px)",
                    color: C.tomato,
                    lineHeight: 1.08,
                    letterSpacing: "-2px",
                    margin: "0 0 20px",
                  }}
                >
                  Every strong project needs a guide.
                </h2>

                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 15,
                    color:"#4a4a4a",
                    lineHeight: 1.8,
                    margin: 0,
                    maxWidth: 380,
                  }}
                >
                  NutriLens was developed under the academic supervision of a faculty
                  researcher at the University of Constantine 2, who guided the
                  project's technical scope and research methodology.
                </p>
              </FadeUp>

              {/* Right: supervisor card */}
              <FadeUp delay={0.15}>
                <div
                  style={{
                    background: C.white,
                    borderRadius: 24,
                    padding: "40px 36px",
                    border: `2px solid rgba(255,255,255,0.15)`,
                    boxShadow: `6px 6px 0 ${C.tomato}`,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Decorative lime dot */}
                  <div
                    style={{
                      position: "absolute",
                      top: -24,
                      right: -24,
                      width: 96,
                      height: 96,
                      background: C.lime,
                      borderRadius: "50%",
                      opacity: 0.18,
                    }}
                  />

                  <div style={{ position: "relative", zIndex: 1 }}>
                    {/* Avatar */}
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: "50%",
                        background: C.forest,
                        border: `3px solid ${C.lime}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 20,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Fraunces', serif",
                          fontWeight: 900,
                          fontStyle: "italic",
                          fontSize: 30,
                          color: C.white,
                          lineHeight: 1,
                        }}
                      >
                        H
                      </span>
                    </div>

                    <div
                      style={{
                        fontFamily: "'Fraunces', serif",
                        fontWeight: 800,
                        fontSize: 22,
                        color: C.forest,
                        marginBottom: 6,
                        letterSpacing: "-0.3px",
                      }}
                    >
                      Dr. Hadjer Bechinia
                    </div>

                    <div
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#5a5a5a",
                        marginBottom: 20,
                      }}
                    >
                      University of Constantine 2
                    </div>

                    <div
                      style={{
                        height: 1,
                        background: C.cream,
                        marginBottom: 20,
                      }}
                    />

                    <div
                      style={{
                        display: "inline-block",
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 11,
                        fontWeight: 700,
                        color: C.forest,
                        background: C.lime,
                        padding: "4px 12px",
                        borderRadius: 999,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      Thesis Supervisor
                    </div>
                  </div>
                </div>
              </FadeUp>
            </div>
          </div>
        </section>


        <WaveToFooter fromColor="#FEF8E0" />
        <Footer />
      </main>
    </div>
  );
}
