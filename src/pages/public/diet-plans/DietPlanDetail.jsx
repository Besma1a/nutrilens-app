import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { publicDietPlanTemplatesApi } from "../../../services/api";

const TYPE_IMAGES = {
  standard: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&q=85",
  seasonal: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&q=85",
  medical:  "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1200&q=85",
  ramadan:  "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=85",
  custom:   "https://images.unsplash.com/photo-1547496502-affa22e38b2d?w=1200&q=85",
};

const TYPE_LABELS = {
  standard: "Standard",
  seasonal: "Seasonal",
  medical:  "Medical",
  ramadan:  "Ramadan",
  custom:   "Custom",
};

const DietPlanDetail = () => {
  const { id } = useParams();
  const templateId = useMemo(() => {
    const raw = String(id || "").trim();
    if (raw.startsWith("template-")) {
      const n = raw.slice("template-".length);
      return n && /^\d+$/.test(n) ? Number(n) : null;
    }
    return /^\d+$/.test(raw) ? Number(raw) : null;
  }, [id]);

  const [state, setState] = useState({ loading: true, error: "", plan: null });

  useEffect(() => {
    if (!templateId) {
      setState({ loading: false, error: "Plan not found.", plan: null });
      return;
    }
    setState({ loading: true, error: "", plan: null });
    publicDietPlanTemplatesApi
      .getOne(templateId)
      .then((t) => {
        setState({
          loading: false,
          error: "",
          plan: {
            id: `template-${t.id}`,
            name: t.title || "Untitled Plan",
            tag: TYPE_LABELS[t.plan_type] || t.plan_type || "Plan",
            image: t.image_url || TYPE_IMAGES[t.plan_type] || TYPE_IMAGES.standard,
            intro: t.description || "A nutritionist-curated diet plan template.",
            overview: t.overview || t.description || "",
            guidelines: Array.isArray(t.key_guidelines)
              ? t.key_guidelines
              : Array.isArray(t.meals_data?.guidelines)
                ? t.meals_data.guidelines
                : [],
            meals: Array.isArray(t.example_meals)
              ? t.example_meals
              : Array.isArray(t.meals_data?.meals)
                ? t.meals_data.meals
                : [],
            macros: {
              daily: t.daily_calorie_target,
              protein: t.protein_target_g,
              carbs: t.carbs_target_g,
              fat: t.fat_target_g,
            },
          },
        });
      })
      .catch((err) => {
        setState({ loading: false, error: err?.message || "Plan not found.", plan: null });
      });
  }, [templateId]);

  const plan = state.plan;

  if (state.loading) {
    return (
      <div style={styles.notFound}>
        <h2 style={styles.notFoundTitle}>Loading…</h2>
        <Link to="/diet" style={styles.backLink}>← Back to Diet Plans</Link>
      </div>
    );
  }

  if (!plan) {
    return (
      <div style={styles.notFound}>
        <h2 style={styles.notFoundTitle}>{state.error || "Plan not found"}</h2>
        <Link to="/diet" style={styles.backLink}>← Back to Diet Plans</Link>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');

        @media (max-width: 640px) {
          .detail-title { font-size: 28px !important; }
          .detail-image { height: 220px !important; }
        }
      `}</style>

      <div style={styles.page}>
        {/* ── Back bar ── */}
        <div style={styles.topBar}>
          <div style={styles.container}>
            <Link to="/diet" style={styles.backLink}>← Back to Diet Plans</Link>
          </div>
        </div>

        <div style={styles.container}>
          {/* ── Header ── */}
          <div style={styles.header}>
            <span style={styles.tag}>{plan.tag}</span>
            <h1 className="detail-title" style={styles.title}>{plan.name}</h1>
            <p style={styles.intro}>{plan.intro}</p>
          </div>

          {/* ── Image ── */}
          <div className="detail-image" style={styles.imageWrapper}>
            <img src={plan.image} alt={plan.name} style={styles.image} />
          </div>

          {/* ── Content ── */}
          <div style={styles.content}>

            {/* Overview */}
            <div style={styles.block}>
              <h2 style={styles.blockTitle}>
                <span style={styles.blockAccent} />
                Overview
              </h2>
              <p style={styles.paragraph}>
                {plan.overview || "This plan template does not have an overview yet."}
              </p>
            </div>

            {/* Guidelines */}
            <div style={styles.block}>
              <h2 style={styles.blockTitle}>
                <span style={styles.blockAccent} />
                Key Guidelines
              </h2>
              {plan.guidelines?.length ? (
                <ul style={styles.list}>
                  {plan.guidelines.map((g, i) => (
                    <li key={i} style={styles.listItem}>
                      <span style={styles.listDot} />
                      {g}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={styles.paragraph}>No guidelines added yet.</p>
              )}
            </div>

            {/* Example Meals */}
            <div style={styles.block}>
              <h2 style={styles.blockTitle}>
                <span style={styles.blockAccent} />
                Example Meals
              </h2>
              {plan.meals?.length ? (
                <div style={styles.mealsGrid}>
                  {plan.meals.map((meal, i) => (
                    <div key={i} style={styles.mealCard}>
                      <p style={styles.mealText}>{meal}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={styles.paragraph}>No example meals added yet.</p>
              )}
            </div>

          </div>

          {/* ── Footer ── */}
          <div style={styles.footer}>
            <Link to="/diet" style={styles.footerBack}>← More Diet Plans</Link>
          </div>
        </div>
      </div>
    </>
  );
};

const styles = {
 page: {
    minHeight: "100vh",
    backgroundColor: "#ffffff",
    fontFamily: "'DM Sans', sans-serif",
    paddingBottom: "80px",
    display: "block",
    width: "100%",
    boxSizing: "border-box",
  },
  topBar: {
    borderBottom: "1px solid #f0f0f0",
    padding: "16px 24px",
  },
  container: {
    maxWidth: "780px",
    margin: "0 auto",
    padding: "0 24px",
  },
  backLink: {
    fontSize: "14px",
    color: "#888",
    textDecoration: "none",
    fontWeight: "500",
  },
  header: {
    paddingTop: "48px",
    paddingBottom: "28px",
  },
  tag: {
    display: "inline-block",
    backgroundColor: "#f0f7ee",
    color: "#2B5726",
    border: "1px solid #c8e0c4",
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    padding: "4px 10px",
    borderRadius: "20px",
    marginBottom: "16px",
  },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "38px",
    fontWeight: "800",
    color: "#1a1a1a",
    lineHeight: "1.25",
    marginBottom: "14px",
  },
  intro: {
    fontSize: "17px",
    color: "#555",
    lineHeight: "1.75",
    fontWeight: "500",
  },
  imageWrapper: {
    width: "100%",
    height: "380px",
    borderRadius: "16px",
    overflow: "hidden",
    marginBottom: "48px",
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  content: {
    maxWidth: "700px",
    margin: "0 auto",
  },
  block: {
    marginBottom: "40px",
  },
  blockTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "20px",
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: "16px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  blockAccent: {
    display: "inline-block",
    width: "4px",
    height: "20px",
    backgroundColor: "#F19335",
    borderRadius: "4px",
    flexShrink: 0,
  },
  paragraph: {
    fontSize: "15px",
    color: "#555",
    lineHeight: "1.85",
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  listItem: {
    fontSize: "15px",
    color: "#444",
    lineHeight: "1.65",
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
  },
  listDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    backgroundColor: "#2B5726",
    marginTop: "7px",
    flexShrink: 0,
  },
  mealsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px",
  },
  mealCard: {
    backgroundColor: "#fafafa",
    border: "1px solid #f0f0f0",
    borderRadius: "10px",
    padding: "14px 16px",
  },
  mealText: {
    fontSize: "14px",
    color: "#555",
    lineHeight: "1.6",
    margin: 0,
  },
  footer: {
    marginTop: "56px",
    paddingTop: "24px",
    borderTop: "1px solid #f0f0f0",
  },
  footerBack: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#F19335",
    textDecoration: "none",
  },
  notFound: {
    textAlign: "center",
    padding: "100px 24px",
  },
  notFoundTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "28px",
    color: "#333",
    marginBottom: "20px",
  },
};

export default DietPlanDetail;
