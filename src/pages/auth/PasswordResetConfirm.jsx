// src/pages/auth/PasswordResetConfirm.jsx
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { confirmPasswordReset } from "../../services/api";

export default function PasswordResetConfirm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Get the token from the URL: /password-reset/confirm?token=xxxx
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError("Invalid reset link. Please request a new one.");
      return;
    }

    setIsLoading(true);

    try {
      await confirmPasswordReset(token, password, confirm);
      // Success — go to login with a success message
      navigate("/login", { replace: true, state: { reset: true } });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-layout" style={{ maxWidth: 440, margin: "0 auto", gridTemplateColumns: "1fr" }}>
        <div className="auth-form-card" style={{ maxWidth: 420, width: "100%", margin: "0 auto" }}>
          <div className="auth-panel-inner">
            <h1 className="auth-title" style={{ marginBottom: 8 }}>Set new password</h1>
            <p className="auth-sub" style={{ marginBottom: 24 }}>
              Choose a strong password you have not used here before.
            </p>

            {error && (
              <div style={{
                background: "#fef2f2", border: "1px solid #fecaca",
                borderRadius: "10px", padding: "12px 16px",
                marginBottom: "16px", color: "#dc2626", fontSize: "14px"
              }}>
                {error}
              </div>
            )}

            {!token && (
              <div style={{
                background: "#fef2f2", border: "1px solid #fecaca",
                borderRadius: "10px", padding: "12px 16px",
                marginBottom: "16px", color: "#dc2626", fontSize: "14px"
              }}>
                Invalid or missing reset token. Please request a new reset link.
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 18 }}>
                <label htmlFor="npw" className="auth-label">New password</label>
                <input
                  id="npw" type="password" className="auth-input"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  minLength={8} required autoComplete="new-password"
                />
              </div>
              <div style={{ marginBottom: 22 }}>
                <label htmlFor="cpw" className="auth-label">Confirm password</label>
                <input
                  id="cpw" type="password" className="auth-input"
                  value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  minLength={8} required autoComplete="new-password"
                />
              </div>
              <button type="submit" className="auth-btn-submit"
                style={{ marginBottom: 16 }} disabled={isLoading || !token}>
                {isLoading ? "Updating..." : "Update password"}
              </button>
              <div className="auth-foot-note">
                <Link to="/login" className="auth-link">Back to login</Link>
                {" · "}
                <Link to="/register" className="auth-link">Create account</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}