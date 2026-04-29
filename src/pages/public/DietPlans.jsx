import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { C } from "./constants/tokens";
import FadeUp from "./FadeUp";
import { publicDietPlanTemplatesApi } from "../../services/api";
import DietCard from "../../components/diet-plans/DietCard";

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

export default function DietPlans() {
  const [state, setState] = useState({ loading: true, items: [] });

  useEffect(() => {
    publicDietPlanTemplatesApi.list()
      .then((rows) => {
        const raw = (Array.isArray(rows) ? rows : rows?.results || [])
          .filter((t) => t && t.is_published)
          .slice(0, 3);
        
        setState({ loading: false, items: raw.map(toCardShape) });
      })
      .catch(() => {
        setState({ loading: false, items: [] });
      });
  }, []);

  if (!state.loading && state.items.length === 0) return null;

  return (
    <section style={{ background: C.bg, padding: "80px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 13, color: C.tomato, letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 }}>
              Evidence-Based
            </div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
              <div style={{ flex: 1, minWidth: 0 }} />
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: "clamp(28px, 4vw, 44px)", color: C.forest, margin: 0 }}>
                Diet Plans
              </h2>
              <div style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "flex-end", paddingLeft: 12 }}>
                <Link
                  to="/diet"
                  style={{
                    fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 600,
                    color: C.tomato, textDecoration: "none", whiteSpace: "nowrap",
                  }}
                >
                  See more →
                </Link>
              </div>
            </div>
          </div>
        </FadeUp>

        {state.loading ? (
          <div style={{ textAlign: "center", color: C.forest, opacity: 0.7 }}>Loading plans...</div>
        ) : (
          <div className="plans-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            {state.items.map((plan, i) => (
              <FadeUp key={plan.id} delay={i * 0.1}>
                <DietCard plan={plan} />
              </FadeUp>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
