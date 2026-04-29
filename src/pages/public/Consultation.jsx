import { Users, Video, MessageCircle, ArrowRight } from "lucide-react";
import { C, CONSULTATION_CARDS } from "./constants/tokens";
import FadeUp from "./FadeUp";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const ICON_MAP = [Users, Video, MessageCircle];

export default function Consultation() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleBookSession = () => {
    navigate(user ? "/user/dashboard" : "/login");
  };

  return (
    /* Forest green bg — stays the same, lime used only for eyebrow label */
    <section id="consultation" style={{ background: C.forest, padding: "80px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            {/* Lime as a small eyebrow accent tag */}
            <div
              style={{
                display: "inline-block",
                background: C.lime,
                borderRadius: 999,
                padding: "4px 14px",
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 700, fontSize: 12,
                color: C.forest,
                letterSpacing: 2,
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              Professional Care
            </div>
            <h2
              style={{
                fontFamily: "'Outfit', sans-serif", fontWeight: 800,
                fontSize: "clamp(28px, 4vw, 44px)", color: C.white, margin: 0,
              }}
            >
              Online Dietitian Consultation
            </h2>
          </div>
        </FadeUp>

        <div
          className="consult-grid"
          style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}
        >
          {CONSULTATION_CARDS.map((card, i) => {
            const Icon = ICON_MAP[i];
            return (
              <FadeUp key={i} delay={i * 0.1}>
                <div
                  style={{
                    /* warm neutral card bg */
                    background: C.bg,
                    borderRadius: 20,
                    padding: "36px 28px",
                    height: "100%",
                    border: `1px solid ${C.cream}`,
                  }}
                >
                  {/* Icon box — forest bg with lime icon = lime as small accent */}
                  <div
                    style={{
                      width: 56, height: 56,
                      background: C.forest,
                      borderRadius: 16,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      marginBottom: 20,
                    }}
                  >
                    <Icon size={26} color={C.lime} />
                  </div>

                  <h3
                    style={{
                      fontFamily: "'Outfit', sans-serif", fontWeight: 700,
                      fontSize: 20, color: C.forest, margin: "0 0 12px",
                    }}
                  >
                    {card.title}
                  </h3>

                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif", fontSize: 15,
                      color: "rgba(43,87,38,0.65)", lineHeight: 1.7, margin: 0,
                    }}
                  >
                    {card.desc}
                  </p>
                </div>
              </FadeUp>
            );
          })}
        </div>

        <FadeUp delay={0.3}>
          <div style={{ textAlign: "center", marginTop: 48 }}>
            <button
              onClick={handleBookSession}
              style={{
                background: C.tomato, color: C.white, border: "none",
                borderRadius: 20, padding: "15px 36px",
                fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 600,
                display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer",
              }}
            >
              Book Your First Session <ArrowRight size={16} />
            </button>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
