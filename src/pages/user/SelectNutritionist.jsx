import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/layout/Toast";
import { consultationsApi, patientsApi } from "../../services/api";

const pageStyles = {
  wrapper: { maxWidth: 1120, margin: "0 auto", padding: "0 16px" },
  hero: {
    background: "linear-gradient(135deg, rgba(43,87,38,0.08), rgba(241,147,53,0.12))",
    border: "1px solid var(--border)",
    borderRadius: "24px",
    padding: "32px 28px",
    marginBottom: 24,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 20,
  },
};

function getImageUrl(src) {
  if (!src) return null;
  if (src.startsWith("http")) return src;
  return `${window.location.protocol}//${window.location.hostname}:8000${src}`;
}

export default function SelectNutritionist() {
  const { user, updateUserState } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [nutritionists, setNutritionists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);

  useEffect(() => {
    if (!user?.isSubscribed) {
      navigate("/user/subscribe", { replace: true });
      return;
    }
    if (user?.managedBy) {
      navigate("/user/dashboard", { replace: true });
      return;
    }

    const loadNutritionists = async () => {
      try {
        const data = await consultationsApi.listNutritionists();
        setNutritionists(Array.isArray(data) ? data : []);
      } catch (error) {
        toast({ message: error.message || "Failed to load nutritionists.", type: "error" });
      } finally {
        setLoading(false);
      }
    };

    loadNutritionists();
  }, [navigate, toast, user?.isSubscribed, user?.managedBy]);

  const cards = useMemo(
    () =>
      nutritionists.map((nutritionist) => ({
        ...nutritionist,
        image: getImageUrl(nutritionist.profile_picture),
      })),
    [nutritionists]
  );

  const handleSelect = async (nutritionist) => {
    setSubmittingId(nutritionist.id);
    try {
      const response = await patientsApi.selectNutritionist(nutritionist.id);
      updateUserState((prev) => ({
        ...prev,
        managedBy: response.managedBy,
        managedByUsername: response.nutritionistName,
        nutritionistId: response.nutritionistId,
      }));
      toast({
        message: `${response.nutritionistName} has been assigned to your account.`,
        type: "success",
      });
      navigate("/user/dashboard");
    } catch (error) {
      toast({ message: error.message || "Could not assign nutritionist.", type: "error" });
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div style={pageStyles.wrapper}>
      <div style={pageStyles.hero}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--g2)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>
          Meet Our Expert Page
        </div>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: "var(--ink-1)" }}>Choose your nutritionist</h1>
        <p style={{ margin: "10px 0 0", color: "var(--ink-4)", maxWidth: 700, lineHeight: 1.6 }}>
          Your subscription is active. Pick the nutritionist you want to work with and we’ll take you straight to your dashboard.
        </p>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--ink-5)" }}>Loading nutritionists...</div>
      ) : (
        <div style={pageStyles.grid}>
          {cards.map((nutritionist) => (
            <div key={nutritionist.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ height: 220, background: "#f8fafc" }}>
                {nutritionist.image ? (
                  <img
                    src={nutritionist.image}
                    alt={nutritionist.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: 42, color: "var(--ink-5)" }}>
                    {nutritionist.name?.charAt(0) || "N"}
                  </div>
                )}
              </div>
              <div style={{ padding: 22 }}>
                <div style={{ display: "inline-flex", padding: "4px 10px", borderRadius: 999, background: "rgba(43,87,38,0.08)", color: "var(--g2)", fontSize: 11, fontWeight: 700, marginBottom: 12 }}>
                  {nutritionist.specialization_display || "Nutrition Specialist"}
                </div>
                <h3 style={{ margin: "0 0 10px", fontSize: 20, color: "var(--ink-1)" }}>{nutritionist.name}</h3>
                <p style={{ margin: "0 0 10px", color: "var(--ink-4)", lineHeight: 1.6 }}>
                  {nutritionist.bio || "Personalized nutrition guidance tailored to your goals."}
                </p>
                {nutritionist.credentials ? (
                  <div style={{ fontSize: 13, color: "var(--ink-5)", marginBottom: 16 }}>
                    <strong style={{ color: "var(--ink-3)" }}>Credentials:</strong> {nutritionist.credentials}
                  </div>
                ) : null}
                <button
                  type="button"
                  className="btn btn-prim"
                  style={{ width: "100%" }}
                  onClick={() => handleSelect(nutritionist)}
                  disabled={submittingId === nutritionist.id}
                >
                  {submittingId === nutritionist.id ? "Assigning..." : "Select Nutritionist"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
