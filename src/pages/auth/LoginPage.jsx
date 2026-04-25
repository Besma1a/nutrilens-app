// src/pages/auth/LoginPage.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { loginUser } from "../../services/api";

const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const HeartIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

export default function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "", rememberMe: false });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Call the real backend
      const data = await loginUser(formData.email, formData.password);

      // Pass user + token to AuthContext
      // login() will store token in global store and state
      login(data.user, data.token);

      // Route based on user role and onboarding status.
      // NOTE: data.user comes directly from the backend (snake_case).
      // AuthContext.login() normalizes it, but we check here before that happens.
      if (data.user.is_staff || data.user.is_superuser) {
        // Admin users → Django admin panel
        window.location.href = "/admin/dashboard";
      } else if (data.user.is_nutritionist) {
        navigate("/nutritionist/dashboard");
      } else if (!data.user.onboarding_complete) {
        navigate("/health-setup");
      } else {
        navigate("/user/dashboard");
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-layout">
        <div className="auth-visual">
          <div className="auth-visual-inner">
            <img
              src="https://images.unsplash.com/photo-1525296416200-59aaed194d0c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaXRuZXNzJTIwZXhlcmNpc2UlMjB3b21hbnxlbnwxfHx8fDE3NzUyMzg5NTN8MA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Fitness and exercise"
            />
          </div>
        </div>

        <div className="auth-form-card">
          <div className="auth-panel-inner">
            <div style={{ marginBottom: "28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                <div className="auth-head-icon">
                  <HeartIcon size={22} />
                </div>
                <h1 className="auth-title">Welcome Back</h1>
              </div>
              <p className="auth-sub">Continue your health journey</p>
            </div>

            {/* Show error if login fails */}
            {error && (
              <div style={{
                background: "#fef2f2", border: "1px solid #fecaca",
                borderRadius: "10px", padding: "12px 16px",
                marginBottom: "20px", color: "#dc2626", fontSize: "14px"
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "20px" }}>
                <label htmlFor="email" className="auth-label">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  required
                  className="auth-input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label htmlFor="password" className="auth-label">Password</label>
                <div className="auth-input-wrap">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    required
                    className="auth-input auth-input--has-toggle"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="auth-toggle-vis"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <div className="auth-row-check" style={{ marginBottom: "22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    id="remember"
                    checked={formData.rememberMe}
                    onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                    style={{ width: "16px", height: "16px", accentColor: "var(--g2)", cursor: "pointer" }}
                  />
                  <label htmlFor="remember" style={{ fontSize: "14px", color: "var(--ink-3)", cursor: "pointer" }}>
                    Remember me
                  </label>
                </div>
                <Link to="/password-reset" className="auth-link">Forgot password?</Link>
              </div>

              <button
                type="submit"
                className="auth-btn-submit"
                style={{ marginBottom: "22px" }}
                disabled={isLoading}
              >
                {isLoading ? "Logging in..." : "Login"}
              </button>

              <div className="auth-foot-note">
                Don&apos;t have an account?{" "}
                <Link to="/register" className="auth-link">Create Account</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}