// src/pages/auth/PasswordResetRequest.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../../services/api";

function KeyIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--g2)"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="M21 2l-9.6 9.6" />
      <path d="M15.5 7.5l3 3L22 7l-3-3" />
    </svg>
  );
}

export default function PasswordResetRequest() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await requestPasswordReset(email);
      setIsSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-stack">
        <div className="auth-form-card">
          <div className="auth-panel-inner">
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
              <div style={{
                padding: 16, borderRadius: 14, background: "rgba(34, 160, 90, 0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <KeyIcon />
              </div>
            </div>

            {isSubmitted ? (
              <>
                <h1 className="auth-title" style={{ textAlign: "center", marginBottom: 10 }}>
                  Check your email
                </h1>
                <p className="auth-sub" style={{ textAlign: "center", marginBottom: 24 }}>
                  If an account exists for <strong style={{ color: "var(--ink-2)" }}>{email}</strong>,
                  you will receive a reset link shortly.
                </p>
                <Link to="/login" className="auth-btn-ghost"
                  style={{ display: "block", textAlign: "center", textDecoration: "none", lineHeight: "48px" }}>
                  Back to login
                </Link>
                <p style={{ textAlign: "center", marginTop: 16 }}>
                  <button type="button" className="auth-link"
                    style={{ border: "none", background: "none", cursor: "pointer", font: "inherit" }}
                    onClick={() => { setIsSubmitted(false); setEmail(""); }}>
                    Try another email
                  </button>
                </p>
              </>
            ) : (
              <>
                <h1 className="auth-title" style={{ textAlign: "center", marginBottom: 10 }}>
                  Reset password
                </h1>
                <p className="auth-sub" style={{ textAlign: "center", marginBottom: 24 }}>
                  Enter your email and we will send you a secure link.
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

                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: 18 }}>
                    <label htmlFor="pr-email" className="auth-label">Email address</label>
                    <input
                      id="pr-email" type="email" className="auth-input"
                      placeholder="you@example.com" value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required autoComplete="email"
                    />
                  </div>
                  <button type="submit" className="auth-btn-submit" disabled={isLoading}>
                    {isLoading ? "Sending…" : "Send reset link"}
                  </button>
                </form>

                <Link to="/login" className="auth-btn-ghost"
                  style={{ display: "block", textAlign: "center", textDecoration: "none", lineHeight: "48px" }}>
                  Back to login
                </Link>
              </>
            )}
          </div>
        </div>

        {!isSubmitted && (
          <div className="auth-foot-note" style={{ marginTop: 20, textAlign: "center" }}>
            <p style={{ marginBottom: 8 }}>
              New here? <Link to="/register" className="auth-link">Create an account</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}