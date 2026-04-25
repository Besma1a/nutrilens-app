// src/pages/auth/EmailVerification.jsx
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { resendVerificationEmail, verifyEmail, setGlobalToken } from "../../services/api";

function MailIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--g2)"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 7l10 7 10-7" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--g2)"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export default function EmailVerification() {
  const { updateUserState } = useAuth();
  const [isVerified, setIsVerified] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the email — either from navigation state or URL
  const email = location.state?.email || "";

  // If the URL has a token (user clicked the email link), verify automatically
  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      verifyEmail(token)
        .then((data) => {
          // Backend returns { token, user } after verification
          // CRITICAL: Store the new token for future API calls
          if (data.token) {
            setGlobalToken(data.token);
          }
          // Update user state with verified flag and new user data
          updateUserState((prev) => ({
            ...prev,
            ...data.user,
            emailVerified: true,
          }));
          setIsVerified(true);
        })
        .catch((err) => {
          setError(err.message);
        });
    }
  }, [searchParams, updateUserState]);

  const handleResendEmail = async () => {
    setIsResending(true);
    setError("");
    try {
      await resendVerificationEmail(email);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-stack">
        <div className="auth-form-card" style={{ textAlign: "center" }}>
          <div className="auth-panel-inner">

            {isVerified ? (
              <>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
                  <div style={{
                    width: 88, height: 88, borderRadius: "50%",
                    background: "rgba(34, 160, 90, 0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <CheckCircleIcon />
                  </div>
                </div>
                <h1 className="auth-title" style={{ marginBottom: 10 }}>Email verified</h1>
                <p className="auth-sub" style={{ marginBottom: 28, maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>
                  Continue to your wellness profile setup. You can change these details anytime in Profile.
                </p>
                <button type="button" className="auth-btn-submit"
                  onClick={() => navigate("/health-setup", { replace: true })}>
                  Continue to health setup
                </button>
                <div style={{ marginTop: 16 }}>
                  <Link to="/login" className="auth-link" style={{ fontSize: 13, fontWeight: 500 }}>
                    Skip for now, go to login
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
                  <div style={{
                    width: 88, height: 88, borderRadius: "50%",
                    background: "rgba(34, 160, 90, 0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <MailIcon />
                  </div>
                </div>
                <h1 className="auth-title" style={{ marginBottom: 10 }}>Verify your email</h1>
                <p className="auth-sub" style={{ marginBottom: 28, maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>
                  We sent a verification link to <strong>{email}</strong>. Confirm your address to continue.
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

                <button type="button" className="auth-btn-secondary"
                  onClick={handleResendEmail} disabled={isResending}>
                  {isResending ? "Sending…" : "Resend verification email"}
                </button>

                <Link to="/login" className="auth-btn-ghost"
                  style={{ display: "block", textAlign: "center", textDecoration: "none", lineHeight: "48px" }}>
                  Back to login
                </Link>
              </>
            )}
          </div>
        </div>

        <p className="auth-foot-note" style={{ marginTop: 20, textAlign: "center" }}>
          No message? Check spam, or{" "}
          <Link to="/register" className="auth-link">return to register</Link>.
        </p>
      </div>
    </div>
  );
}