// src/pages/auth/RegisterPage.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { registerUser } from "../../services/api";

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

export default function RegisterPage() {
  const { registerUser: saveToAuth } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "", email: "", password: "", confirmPassword: "", agreedToTerms: false,
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      // Call the real backend
      const data = await registerUser(
        formData.fullName.trim(),
        formData.email.trim(),
        formData.password,
        formData.confirmPassword,
      );

      // Backend returns { token, user }
      // Save BOTH token and user to AuthContext
      saveToAuth(data.user, data.token);

      // Go to email verification page
      navigate("/verify-email", { replace: true, state: { email: formData.email.trim() } });

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
              src="https://images.unsplash.com/photo-1580916846078-19be39005e32?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWFsdGh5JTIwbGlmZXN0eWxlJTIwd2VsbG5lc3N8ZW58MXx8fHwxNzc1MTMzNTAyfDA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Health and wellness"
            />
          </div>
        </div>

        <div className="auth-form-card">
          <div className="auth-panel-inner">
            <div style={{ marginBottom: "28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                <div className="auth-head-icon"><HeartIcon size={22} /></div>
                <h1 className="auth-title">Create Account</h1>
              </div>
              <p className="auth-sub">Start your health journey today</p>
            </div>

            {/* Show error if registration fails */}
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
              <div style={{ marginBottom: "18px" }}>
                <label htmlFor="fullName" className="auth-label">Full Name</label>
                <input
                  id="fullName" type="text" placeholder="John Doe" required
                  className="auth-input" value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: "18px" }}>
                <label htmlFor="email" className="auth-label">Email</label>
                <input
                  id="email" type="email" placeholder="john@example.com" required
                  className="auth-input" value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: "18px" }}>
                <label htmlFor="password" className="auth-label">Password</label>
                <div className="auth-input-wrap">
                  <input
                    id="password" type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password" required minLength={8}
                    className="auth-input auth-input--has-toggle" value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button type="button" className="auth-toggle-vis"
                    onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label htmlFor="confirmPassword" className="auth-label">Confirm Password</label>
                <div className="auth-input-wrap">
                  <input
                    id="confirmPassword" type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter your password" required minLength={8}
                    className="auth-input auth-input--has-toggle" value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  />
                  <button type="button" className="auth-toggle-vis"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "22px" }}>
                <input
                  type="checkbox" id="terms" checked={formData.agreedToTerms}
                  onChange={(e) => setFormData({ ...formData, agreedToTerms: e.target.checked })}
                  style={{ width: "16px", height: "16px", accentColor: "var(--g2)", cursor: "pointer", marginTop: "3px", flexShrink: 0 }}
                />
                <label htmlFor="terms" style={{ fontSize: "14px", color: "var(--ink-3)", cursor: "pointer", lineHeight: 1.6 }}>
                  I agree to the <a href="#" className="auth-link">Terms and Conditions</a>{" "}and{" "}
                  <a href="#" className="auth-link">Privacy Policy</a>
                </label>
              </div>

              <button
                type="submit" className="auth-btn-submit"
                disabled={!formData.agreedToTerms || isLoading}
                style={{ marginBottom: "22px" }}
              >
                {isLoading ? "Creating account..." : "Create Account"}
              </button>

              <div className="auth-foot-note">
                Already have an account?{" "}
                <Link to="/login" className="auth-link">Login</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}