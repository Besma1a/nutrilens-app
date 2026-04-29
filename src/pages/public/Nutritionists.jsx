import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import Header from "./Header";
import Footer from "./Footer";
import NutritionistCard from "../../components/NutritionistCard";
import Newsletter from "./Newsletter";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/layout/Toast";
import { consultationsApi, patientsApi } from "../../services/api";

function normalizeListPayload(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

const Nutritionists = () => {
  const { user, updateUserState } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [nutritionists, setNutritionists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState(null);

  const fromSubscription = searchParams.get("from") === "subscription";

  useEffect(() => {
    consultationsApi
      .listNutritionists()
      .then((data) => {
        const list = normalizeListPayload(data);
        setNutritionists(list);
      })
      .catch(() => {
        setNutritionists([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const cards = useMemo(
    () =>
      nutritionists.map((item) => ({
        id: item.id,
        name: item.name,
        specialty: item.specialization_display || "Nutrition Specialist",
        description: item.bio || "Personalized nutrition support for your goals.",
        image: item.profile_picture
          ? item.profile_picture.startsWith("http")
            ? item.profile_picture
            : `${window.location.protocol}//localhost:8000${item.profile_picture}`
          : "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&q=80",
        experience: item.credentials ? "Certified" : "Experienced",
        rating: "5.0",
      })),
    [nutritionists]
  );

  const canSelect = !!user?.isSubscribed && !user?.managedBy;

  const handleCardClick = async (expert) => {
    const selected = nutritionists.find((item) => item.id === expert.id);
    if (!selected) return;

    if (!user) {
      navigate("/login");
      return;
    }

    if (!user.isSubscribed) {
      toast({ message: "Subscribe first to choose a nutritionist.", type: "info" });
      navigate("/user/subscribe");
      return;
    }

    if (user.managedBy) {
      navigate("/user/dashboard");
      return;
    }

    setAssigningId(selected.id);
    try {
      const response = await patientsApi.selectNutritionist(selected.id);
      updateUserState((prev) => ({
        ...prev,
        managedBy: response.managedBy,
        managedByUsername: response.nutritionistName,
      }));
      toast({ message: `${response.nutritionistName} selected successfully.`, type: "success" });
      navigate("/user/dashboard");
    } catch (error) {
      toast({ message: error.message || "Failed to select nutritionist.", type: "error" });
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div style={{ display: "block", width: "100%", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');

        .experts-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 28px;
        }
        @media (max-width: 1024px) {
          .experts-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .experts-grid { grid-template-columns: 1fr; }
          .experts-title { font-size: 34px !important; }
        }
      `}</style>

      <Header />

      <div style={styles.page}>
        <div style={styles.hero}>
          <div style={styles.heroInner}>
            <h1 className="experts-title" style={styles.heroTitle}>
              Meet Our Experts
            </h1>
            <p style={styles.heroSub}>
              Connect with certified nutritionists tailored to your health needs and goals.
            </p>
            {fromSubscription ? (
              <p style={{ ...styles.heroSub, color: "#2B5726", fontWeight: 700, marginTop: 8 }}>
                Subscription active. Select your nutritionist to continue.
              </p>
            ) : null}
          </div>
        </div>

        <div style={styles.container}>
          {loading ? (
            <div style={{ textAlign: "center", color: "#6b7280", padding: "18px 0" }}>Loading experts...</div>
          ) : (
            <div className="experts-grid">
              {cards.map((expert) => (
                <NutritionistCard
                  key={expert.id}
                  expert={expert}
                  buttonText={
                    assigningId === expert.id
                      ? "Assigning..."
                      : canSelect
                        ? "Select Nutritionist"
                        : user?.managedBy
                          ? "Already Assigned"
                          : "Book Consultation"
                  }
                  buttonDisabled={assigningId === expert.id || !!user?.managedBy}
                  onButtonClick={handleCardClick}
                />
              ))}
            </div>
          )}
        </div>
      </div>
       <Newsletter/>
      <Footer />
    </div>
  );
};

const styles = {
  page: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    backgroundColor: "#ffffff",
    fontFamily: "'DM Sans', sans-serif",
    paddingBottom: "80px",
  },
  hero: {
    background: "linear-gradient(to bottom, #f9f6f1, #ffffff)",
    borderBottom: "1px solid #f0ece4",
    padding: "90px 24px 56px",
    marginTop: "48px",
    textAlign: "center",
  },
  heroInner: {
    maxWidth: "560px",
    margin: "0 auto",
  },
  heroTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "48px",
    fontWeight: "800",
    color: "#A50C05",
    lineHeight: "1.2",
    marginBottom: "16px",
  },
  heroSub: {
    fontSize: "16px",
    color: "#777",
    lineHeight: "1.7",
    fontFamily: "'DM Sans', sans-serif",
  },
  container: {
    maxWidth: "1140px",
    margin: "0 auto",
    padding: "56px 24px 0",
  },
};

export default Nutritionists;