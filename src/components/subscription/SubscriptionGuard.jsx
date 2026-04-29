import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function SubscriptionGuard({ children, title }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user?.planName === 'Pro' && user?.subscriptionStatus === 'active') {
    return children;
  }

  return (
    <div style={{ padding: 28, maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
      <h1 style={{ margin: 0, fontSize: 28, color: "#111827" }}>{title}</h1>
      <p style={{ margin: "14px 0 24px", color: "#4b5563", fontSize: 15, lineHeight: 1.7 }}>
        Upgrade to a Pro plan to unlock this feature and get full access to your personalized support.
      </p>
      <button
        type="button"
        onClick={() => navigate("/user/subscribe")}
        style={{
          border: "none",
          background: "#2B5726",
          color: "#fff",
          padding: "12px 22px",
          borderRadius: 999,
          cursor: "pointer",
          fontSize: 15,
          fontWeight: 700,
        }}
      >
        Go to Subscription
      </button>
    </div>
  );
}
