import Header from "./Header";
import Footer from "./Footer";
import FadeUp from "./FadeUp";
import { C } from "./constants/tokens";

const TEAM = [
  {
    name: "Zidouri Hadil",
    role: "Full-Stack Developer & AI Integration",
    initial: "H",
    color: C.forest,
    /* TODO: replace with real photo — src="assets/team/hadil.jpg" */
  },
  {
    name: "Messaoudi Besmala",
    role: "Full-Stack Developer & Backend Architecture",
    initial: "B",
    color: C.tomato,
    /* TODO: replace with real photo — src="assets/team/besmala.jpg" */
  },
  {
    name: "Karboua Douaa",
    role: "Full-Stack Developer & UI/UX Design",
    initial: "D",
    color: C.ochre,
    /* TODO: replace with real photo — src="assets/team/douaa.jpg" */
  },
];

export default function AboutPage() {
  return (
    <div className="public-page">
      <Header />
      <main style={{ paddingTop: 72 }}>

        {/* ── Project ── */}
        <section style={{ background: C.bg, padding: "80px 24px" }}>
          <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
            <FadeUp>
              <span style={{
                display: "inline-block",
                background: C.lime,
                color: C.forest,
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "4px 14px",
                borderRadius: 999,
                marginBottom: 20,
              }}>
                Our Story
              </span>

              <h1 style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 800,
                fontSize: "clamp(28px, 6vw, 48px)",
                color: C.forest,
                margin: "0 0 24px",
                lineHeight: 1.1,
                letterSpacing: "-1px",
              }}>
                About NutriLens
              </h1>

              <p style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 17,
                color: "#4b5563",
                lineHeight: 1.8,
                margin: "0 0 40px",
              }}>
                NutriLens is a graduation project built to make personalized nutrition
                accessible to everyone. It combines an online consultation platform
                connecting users with certified nutritionists and an AI-powered calorie
                tracker that identifies food from photos and estimates nutritional values.
              </p>

              <div style={{
                padding: "24px 32px",
                background: C.white,
                borderRadius: 20,
                border: `1px solid ${C.cream}`,
              }}>
                <p style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 15,
                  color: C.forest,
                  fontWeight: 600,
                  margin: "0 0 6px",
                  lineHeight: 1.7,
                }}>
                  University of Constantine 2 · Faculty of NTIC
                </p>
                <p style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 15,
                  color: C.forest,
                  fontWeight: 600,
                  margin: "0 0 6px",
                  lineHeight: 1.7,
                }}>
                  Department of Fundamental Computing and its Applications (IFA)
                </p>
                <p style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 14,
                  color: "#6b7280",
                  fontWeight: 400,
                  margin: 0,
                }}>
                  Specialty: Computer Sciences (SCI) — June 2026
                </p>
              </div>
            </FadeUp>
          </div>
        </section>

        {/* ── Team ── */}
        <section style={{ background: C.white, padding: "80px 24px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <FadeUp>
              <div style={{ textAlign: "center", marginBottom: 56 }}>
                <span style={{
                  display: "inline-block",
                  background: C.lime,
                  color: C.forest,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "4px 14px",
                  borderRadius: 999,
                  marginBottom: 16,
                }}>
                  The People
                </span>
                <h2 style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 800,
                  fontSize: 36,
                  color: C.forest,
                  margin: 0,
                  letterSpacing: "-0.5px",
                }}>
                  Meet the Team
                </h2>
              </div>
            </FadeUp>

            <div className="about-team-grid" style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 32,
            }}>
              {TEAM.map(({ name, role, initial, color }, i) => (
                <FadeUp key={name} delay={i * 0.1}>
                  <div style={{
                    background: C.bg,
                    borderRadius: 24,
                    padding: "40px 32px",
                    textAlign: "center",
                    border: `1px solid ${C.cream}`,
                  }}>
                    {/* TODO: replace with real photo — src="assets/team/<name>.jpg" */}
                    <div style={{
                      width: 88,
                      height: 88,
                      borderRadius: "50%",
                      background: color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 20px",
                    }}>
                      <span style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 800,
                        fontSize: 32,
                        color: C.white,
                        lineHeight: 1,
                      }}>
                        {initial}
                      </span>
                    </div>

                    <h3 style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 700,
                      fontSize: 20,
                      color: C.forest,
                      margin: "0 0 8px",
                    }}>
                      {name}
                    </h3>

                    <p style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 14,
                      color: "#6b7280",
                      margin: 0,
                      lineHeight: 1.6,
                    }}>
                      {role}
                    </p>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* ── Supervisor ── */}
        <section style={{ background: C.forest, padding: "80px 24px" }}>
          <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
            <FadeUp>
              <span style={{
                display: "inline-block",
                background: C.lime,
                color: C.forest,
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "4px 14px",
                borderRadius: 999,
                marginBottom: 20,
              }}>
                Academic Supervision
              </span>

              <h2 style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 800,
                fontSize: 32,
                color: C.white,
                margin: "0 0 32px",
                letterSpacing: "-0.5px",
              }}>
                Under the supervision of
              </h2>

              <div style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 20,
                padding: "clamp(20px, 5vw, 32px) clamp(20px, 6vw, 40px)",
                display: "inline-block",
                maxWidth: "100%",
              }}>
                <p style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 700,
                  fontSize: 22,
                  color: C.white,
                  margin: "0 0 8px",
                }}>
                  Dr. Hadjer Bechinia
                </p>
                <p style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 15,
                  color: C.lime,
                  fontWeight: 500,
                  margin: 0,
                }}>
                  University of Constantine 2
                </p>
              </div>
            </FadeUp>
          </div>
        </section>

        <Footer />
      </main>
    </div>
  );
}
