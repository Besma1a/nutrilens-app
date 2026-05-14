import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Menu, X } from "lucide-react";
import { C } from "./constants/tokens";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from '../../hooks/useAuth';
import Avatar from "../../components/common/Avatar";

export default function Header({ bg = C.white, scrolledBg = "rgba(254,248,224,0.96)" }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [featOpen, setFeatOpen] = useState(false);
  const [scrolled, setScrolled]  = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout, user } = useAuth();

  // Admin users authenticate via a separate token that AuthContext never
  // sees. Check localStorage directly so the avatar still appears when an
  // admin visits the public home page.
  const isAdminSession = !isAuthenticated && !!localStorage.getItem("adminToken");

  const getDashboardPath = () => {
    if (isAdminSession) return "/admin/dashboard";
    if (user?.isStaff || user?.isSuperuser) return "/admin/dashboard";
    if (user?.isNutritionist) return "/nutritionist/dashboard";
    return "/user/dashboard";
  };

  const scrollToSection = (id) => {
    setFeatOpen(false);
    setMenuOpen(false);
    if (location.pathname === "/") {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/", { state: { scrollTo: id } });
    }
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="public-header"
      style={{
        background: scrolled ? scrolledBg : bg,
        borderBottom: scrolled ? `1px solid ${C.bg}` : "none",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        position: "fixed",
        width: "100%",
        top: 0,
        left: 0,
        zIndex: 100,
        transition: "all 0.3s ease",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 72 }}>

          {/* Logo */}
          <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
            <img
              src="/logos/nutrilens-logo-horizontal.svg"
              alt="NutriLens"
              height="34"
              style={{ display: "block" }}
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: 36 }}>
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setFeatOpen(!featOpen)}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  background: "none", border: "none",
                  fontFamily: "'Inter', sans-serif", fontSize: 15,
                  color: C.forest, fontWeight: 600, cursor: "pointer",
                }}
              >
                Features <ChevronDown size={14} />
              </button>

              {featOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    position: "absolute", top: "calc(100% + 8px)", left: 0,
                    background: C.white, borderRadius: 16, padding: "8px 0",
                    minWidth: 220, border: `1px solid ${C.cream}`, zIndex: 200,
                    boxShadow: "0 8px 24px rgba(43,87,38,0.10)",
                  }}
                >
                  {[
                    { label: "AI Calorie Tracking", id: "ai-tracker" },
                    { label: "Online Consultation", id: "consultation" },
                  ].map(({ label, id }) => (
                    <button
                      key={id}
                      onClick={() => scrollToSection(id)}
                      style={{
                        display: "block", width: "100%", textAlign: "left",
                        padding: "10px 20px", background: "none", border: "none",
                        fontFamily: "'Inter', sans-serif", fontSize: 14,
                        color: C.forest, fontWeight: 500, cursor: "pointer",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
{/* Diet Plans */}
            <Link
              to="/diet"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 15,
                color: C.forest,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Diet Plans
            </Link>

            

            <Link
              to="/plans"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 15,
                color: C.forest,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Pricing
            </Link>
            <Link
              to="/blog"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 15,
                color: C.forest,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Blog
            </Link>
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {isAuthenticated || isAdminSession ? (
              <button
                onClick={() => navigate(getDashboardPath())}
                title={isAdminSession ? "Back to admin panel" : "Go to dashboard"}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  overflow: "hidden",
                  background: C.forest,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 13,
                  fontWeight: 700,
                  color: "white",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {isAdminSession ? (
                  // Admin has no Avatar in AuthContext — render initials from
                  // the adminUser object stored in localStorage.
                  (() => {
                    try {
                      const a = JSON.parse(localStorage.getItem("adminUser") || "{}");
                      const name = a.name || "A";
                      return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                    } catch { return "A"; }
                  })()
                ) : (
                  <Avatar
                    user={user}
                    size={38}
                    style={{ width: "100%", height: "100%" }}
                  />
                )}
              </button>
            ) : (
              <Link
                to="/register"
                style={{
                  background: C.tomato, color: C.white, border: "none",
                  borderRadius: 999, padding: "10px 24px",
                  fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                Sign up
              </Link>
            )}

            <button
              className="mobile-menu-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              style={{ background: "none", border: "none", color: C.forest, display: "none" }}
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            style={{ paddingBottom: 16 }}
          >
            {[
              { label: "AI Calorie Tracking", id: "ai-tracker" },
              { label: "Online Consultation", id: "consultation" },
            ].map(({ label, id }) => (
              <button
                key={id}
                onClick={() => scrollToSection(id)}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "12px 0", background: "none", border: "none",
                  borderBottom: `1px solid ${C.cream}`,
                  fontFamily: "'Inter', sans-serif", fontSize: 15,
                  color: C.forest, fontWeight: 500, cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
            <Link
              to="/diet"
              style={{
                display: "block", padding: "12px 0",
                fontFamily: "'Inter', sans-serif", fontSize: 15,
                color: C.forest, borderBottom: `1px solid ${C.cream}`,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Diet Plans
            </Link>

         
            <Link
              to="/blog"
              style={{
                display: "block",
                padding: "12px 0",
                fontFamily: "'Inter', sans-serif",
                fontSize: 15,
                color: C.forest,
                borderBottom: `1px solid ${C.cream}`,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Blog
            </Link>

            <Link
              to="/plans"
              style={{
                display: "block",
                padding: "12px 0",
                fontFamily: "'Inter', sans-serif",
                fontSize: 15,
                color: C.forest,
                borderBottom: `1px solid ${C.cream}`,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Pricing
            </Link>
          </motion.div>
        )}
      </div>
    </header>
  );
}            