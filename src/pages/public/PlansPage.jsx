import { useNavigate } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import FadeUp from "./FadeUp";
import { C } from "./constants/tokens";
import { useAuth } from "../../context/AuthContext";

const FEATURES = [
  { text: "AI calorie scans",                                  free: "3 per day", pro: "Unlimited" },
  { text: "Browse nutritionists & public content",             free: true,        pro: true },
  { text: "Progress tracking dashboard",                       free: true,        pro: true },
  { text: "Online consultation with a nutritionist",           free: false,       pro: true, pro_label: "4/week" },
  { text: "Personalized diet plan assigned by nutritionist",   free: false,       pro: true },
  { text: "Diet plan updated based on consultation progress",  free: false,       pro: true },
];

function Checkmark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke={C.tomato} strokeWidth="2.5" strokeLinecap="round"
      style={{ flexShrink: 0, marginTop: 1 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function Cross() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="rgba(43,87,38,0.2)" strokeWidth="2.5" strokeLinecap="round"
      style={{ flexShrink: 0, marginTop: 1 }}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function Pill({ text }) {
  return (
    <span style={{
      fontFamily: "'Inter', sans-serif",
      fontSize: 12,
      fontWeight: 700,
      color: C.tomato,
      background: "rgba(165,12,5,0.08)",
      borderRadius: 999,
      padding: "2px 10px",
      flexShrink: 0,
      whiteSpace: "nowrap",
    }}>
      {text}
    </span>
  );
}

export default function PlansPage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const isPro = user?.planName === "Pro" && user?.subscriptionStatus === "active";

  const handleUpgrade = () => {
    if (isAuthenticated) {
      navigate("/user/subscribe");
    } else {
      navigate("/register");
    }
  };

  return (
    <div className="public-page">
      <Header />
      <main style={{ paddingTop: 72 }}>

        <section style={{ background: C.white, padding: "10px 24px 100px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>

            {/* ── Heading ── */}
            <FadeUp>
              <div style={{ textAlign: "center", marginBottom: 56 }}>
                <h1 style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 800,
                  fontSize: "clamp(32px, 5vw, 48px)",
                  color: C.tomato,
                  margin: "0 0 16px",
                  lineHeight: 1.1,
                  letterSpacing: "-1px",
                }}>
                  Choose your plan , Now 
                </h1>

                <p style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 17,
                  color: "#4b5563",
                  lineHeight: 1.7,
                  margin: 0,
                  maxWidth: 520,
                  marginLeft: "auto",
                  marginRight: "auto",
                }}>
                  Start free and upgrade when you're ready for personalized
                  nutritionist support.
                </p>
              </div>
            </FadeUp>

            {/* ── Cards ── */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
              gap: 28,
              alignItems: "start",
            }}>

              {/* ── Free card ── */}
              <FadeUp delay={0}>
                <div style={{
                  background: C.bg,
                  border: `1px solid ${C.cream}`,
                  borderRadius: 24,
                  padding: "36px 32px",
                  display: "flex",
                  flexDirection: "column",
                }}>
                  <div style={{ marginBottom: 28 }}>
                    <h2 style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 800,
                      fontSize: 22,
                      color: C.forest,
                      margin: "0 0 6px",
                    }}>
                      Free
                    </h2>
                    <p style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 14,
                      color: "#6b7280",
                      margin: "0 0 20px",
                      lineHeight: 1.5,
                    }}>
                      Get started with essential tools
                    </p>
                    <div style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 800,
                      fontSize: 44,
                      color: C.forest,
                      letterSpacing: "-1px",
                      lineHeight: 1,
                    }}>
                      $0
                      <span style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 400,
                        fontSize: 15,
                        color: "#6b7280",
                        letterSpacing: 0,
                      }}>
                        /month
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 32 }}>
                    {FEATURES.map((f) => (
                      <div key={f.text} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        {f.free === false ? <Cross /> : <Checkmark />}
                        <span style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: 14,
                          color: f.free === false ? "rgba(43,87,38,0.3)" : "rgba(43,87,38,0.8)",
                          lineHeight: 1.5,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}>
                          {f.text}
                          {typeof f.free === "string" && <Pill text={f.free} />}
                        </span>
                      </div>
                    ))}
                  </div>

                  {!isPro && (
                    <button
                      disabled={isAuthenticated}
                      onClick={() => !isAuthenticated && navigate("/register")}
                      style={{
                        background: "transparent",
                        color: C.forest,
                        border: `1.5px solid ${C.forest}`,
                        borderRadius: 12,
                        padding: "13px 24px",
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: isAuthenticated ? "default" : "pointer",
                        fontFamily: "'Inter', sans-serif",
                        width: "100%",
                        opacity: isAuthenticated ? 0.45 : 1,
                        transition: "opacity 0.2s",
                      }}
                    >
                      {isAuthenticated ? "Your current plan" : "Get Started — Free"}
                    </button>
                  )}
                </div>
              </FadeUp>

              {/* ── Pro card ── */}
              <FadeUp delay={0.1}>
                <div style={{
                  background: C.bg,
                  border: `2px solid ${C.forest}`,
                  borderRadius: 24,
                  padding: "36px 32px",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  boxShadow: "0 8px 32px rgba(43,87,38,0.13)",
                }}>
                  {/* Most Popular badge */}
                  <div style={{
                    position: "absolute",
                    top: -14,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: C.lime,
                    color: C.forest,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    padding: "4px 16px",
                    borderRadius: 999,
                    whiteSpace: "nowrap",
                  }}>
                    Most Popular
                  </div>

                  <div style={{ marginBottom: 28 }}>
                    <h2 style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 800,
                      fontSize: 22,
                      color: C.forest,
                      margin: "0 0 6px",
                    }}>
                      Pro
                    </h2>
                    <p style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 14,
                      color: "#6b7280",
                      margin: "0 0 20px",
                      lineHeight: 1.5,
                    }}>
                      Full access to personalized nutrition care
                    </p>
                    <div style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 800,
                      fontSize: 44,
                      color: C.forest,
                      letterSpacing: "-1px",
                      lineHeight: 1,
                    }}>
                      $9.99
                      <span style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 400,
                        fontSize: 15,
                        color: "#6b7280",
                        letterSpacing: 0,
                      }}>
                        /month
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 32 }}>
                    {FEATURES.map((f) => (
                      <div key={f.text} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <Checkmark />
                        <span style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: 14,
                          color: "rgba(43,87,38,0.8)",
                          lineHeight: 1.5,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}>
                          {f.pro === "Unlimited" ? "Unlimited AI calorie scans" : f.text}
                          {f.pro_label && <Pill text={f.pro_label} />}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    disabled={isPro}
                    onClick={!isPro ? handleUpgrade : undefined}
                    style={{
                      background: C.forest,
                      color: C.white,
                      border: "none",
                      borderRadius: 12,
                      padding: "13px 24px",
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: isPro ? "default" : "pointer",
                      fontFamily: "'Inter', sans-serif",
                      width: "100%",
                      opacity: isPro ? 0.55 : 1,
                      transition: "opacity 0.2s",
                    }}
                    onMouseEnter={(e) => { if (!isPro) e.currentTarget.style.opacity = "0.85"; }}
                    onMouseLeave={(e) => { if (!isPro) e.currentTarget.style.opacity = "1"; }}
                  >
                    {isPro ? "Your current plan" : "Upgrade to Pro"}
                  </button>
                </div>
              </FadeUp>

            </div>
          </div>
        </section>

        <Footer />
      </main>
    </div>
  );
}
