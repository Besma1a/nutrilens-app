import { useEffect, useState } from "react";
import Header from "../Header";
import Footer from "../Footer";
import Newsletter from "../Newsletter";
import DietCard from "../../../components/diet-plans/DietCard";
import { publicDietPlanTemplatesApi } from "../../../services/api";

/* Default images per plan_type for backend plans */
const TYPE_IMAGES = {
  standard: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80",
  seasonal: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&q=80",
  medical:  "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&q=80",
  ramadan:  "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80",
  custom:   "https://images.unsplash.com/photo-1547496502-affa22e38b2d?w=600&q=80",
};

const TYPE_LABELS = {
  standard: "Standard",
  seasonal: "Seasonal",
  medical:  "Medical",
  ramadan:  "Ramadan",
  custom:   "Custom",
};

function toCardShape(t) {
  return {
    id:          `template-${t.id}`,
    name:         t.title || "Untitled Plan",
    description:  t.description || "",
    image:        t.image_url || TYPE_IMAGES[t.plan_type] || TYPE_IMAGES.standard,
    tag:          TYPE_LABELS[t.plan_type] || t.plan_type || "Plan",
  };
}

const DietPlans = () => {
  const [state, setState] = useState({ loading: true, error: "", items: [] });

  useEffect(() => {
    setState({ loading: true, error: "", items: [] });
    publicDietPlanTemplatesApi.list()
      .then((rows) => {
        const raw = (Array.isArray(rows) ? rows : rows?.results || [])
          .filter((t) => t && t.is_published);
        
        setState({ loading: false, error: "", items: raw });
      })
      .catch((err) => {
        setState({
          loading: false,
          error: err?.message || "Failed to load diet plans.",
          items: [],
        });
      });
  }, []);

  const lifestylePlans = state.items
    .filter(p => p.category === "Lifestyle & Occasions")
    .map(toCardShape);
    
  const healthPlans = state.items
    .filter(p => p.category === "For Health Conditions")
    .map(toCardShape);

  return (
    <div style={{ display: "block", width: "100%", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');

        .plans-page {
          min-height: 100vh;
          background-color: #ffffff;
          font-family: 'DM Sans', sans-serif;
          padding-bottom: 80px;
          width: 100%;
          display: block;
          box-sizing: border-box;
        }
        .plans-hero {
          background: linear-gradient(to bottom, #f9f6f1, #ffffff);
          border-bottom: 1px solid #f0ece4;
          padding: 90px 24px 56px;
          margin-top: 48px;
          text-align: center;
          width: 100%;
          box-sizing: border-box;
          display: block;
        }
        .plans-hero-inner {
          max-width: 560px;
          margin: 0 auto;
        }
        .plans-hero-title {
          font-family: 'Playfair Display', serif;
          font-size: 48px;
          font-weight: 800;
          color: #A50C05;
          line-height: 1.2;
          margin-bottom: 16px;
        }
        .plans-hero-sub {
          font-size: 16px;
          color: #777;
          line-height: 1.7;
          margin: 0;
        }
        .plans-container {
          max-width: 1140px;
          margin: 0 auto;
          padding: 56px 24px 0;
          box-sizing: border-box;
        }
        .plans-section {
          margin-bottom: 64px;
        }
        .plans-section-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 28px;
        }
        .plans-section-line {
          display: inline-block;
          width: 4px;
          height: 24px;
          background-color: #F19335;
          border-radius: 4px;
          flex-shrink: 0;
        }
        .plans-section-title {
          font-family: 'Playfair Display', serif;
          font-size: 26px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0;
        }
        .plans-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        @media (max-width: 1024px) {
          .plans-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .plans-grid { grid-template-columns: 1fr; }
          .plans-hero-title { font-size: 34px; }
        }
      `}</style>

      <Header />

      <div className="plans-page">
        <div className="plans-hero">
          <div className="plans-hero-inner">
            <h1 className="plans-hero-title">Diet Plans</h1>
            <p className="plans-hero-sub">
              Explore curated meal plans tailored to your health goals and lifestyle.
            </p>
          </div>
        </div>

        <div className="plans-container">
          {state.error ? (
            <div style={{ padding: "24px 0", color: "#A50C05", fontWeight: 600 }}>
              {state.error}
            </div>
          ) : state.loading ? (
            <div style={{ padding: "24px 0", color: "#777" }}>Loading…</div>
          ) : state.items.length === 0 ? (
            <div style={{ padding: "24px 0", color: "#777" }}>
              No published diet plans yet.
            </div>
          ) : (
            <>
              {lifestylePlans.length > 0 && (
                <div className="plans-section">
                  <div className="plans-section-header">
                    <span className="plans-section-line" />
                    <h2 className="plans-section-title">Lifestyle & Occasions</h2>
                  </div>
                  <div className="plans-grid">
                    {lifestylePlans.map((plan) => (
                      <DietCard key={plan.id} plan={plan} />
                    ))}
                  </div>
                </div>
              )}

              {healthPlans.length > 0 && (
                <div className="plans-section">
                  <div className="plans-section-header">
                    <span className="plans-section-line" />
                    <h2 className="plans-section-title">For Health Conditions</h2>
                  </div>
                  <div className="plans-grid">
                    {healthPlans.map((plan) => (
                      <DietCard key={plan.id} plan={plan} />
                    ))}
                  </div>
                </div>
              )}

              {lifestylePlans.length === 0 && healthPlans.length === 0 && (
                <div style={{ padding: "24px 0", color: "#777" }}>
                  No published diet plans yet.
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <Newsletter />
      <Footer />
    </div>
  );
};

export default DietPlans;