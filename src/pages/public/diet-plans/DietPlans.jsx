import Header from "../Header";
import Footer from "../Footer";
import Newsletter from "../Newsletter";
import DietCard from "../../../components/diet-plans/DietCard";

const PLANS = [
  {
    category: "For Health Conditions",
    items: [
      {
        id: "low-sugar",
        name: "Low Sugar Plan",
        description: "Designed for diabetics and those managing blood sugar levels.",
        image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80",
        tag: "Diabetes-Friendly",
      },
      {
        id: "low-sodium",
        name: "Low Sodium Plan",
        description: "Heart-healthy meals with reduced sodium for blood pressure control.",
        image: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&q=80",
        tag: "Heart Health",
      },
      {
        id: "high-fiber",
        name: "High Fiber Plan",
        description: "Supports digestion and gut health with fiber-rich whole foods.",
        image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&q=80",
        tag: "Gut Health",
      },
    ],
  },
  {
    category: "For Lifestyle & Occasions",
    items: [
      {
        id: "ramadan",
        name: "Ramadan Plan",
        description: "Balanced Suhoor and Iftar meals to stay energized during fasting.",
        image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80",
        tag: "Ramadan",
      },
      {
        id: "weight-loss",
        name: "Weight Loss Plan",
        description: "A calorie-conscious plan with satisfying, nutrient-dense meals.",
        image: "https://images.unsplash.com/photo-1543362906-acfc16c67564?w=600&q=80",
        tag: "Weight Loss",
      },
      {
        id: "muscle-gain",
        name: "Muscle Gain Plan",
        description: "High-protein meals designed to support muscle growth and recovery.",
        image: "https://images.unsplash.com/photo-1547496502-affa22e38b2d?w=600&q=80",
        tag: "Active Lifestyle",
      },
    ],
  },
];

const DietPlans = () => {
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
          font-size: 22px;
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
          {PLANS.map((section) => (
            <div key={section.category} className="plans-section">
              <div className="plans-section-header">
                <span className="plans-section-line" />
                <h2 className="plans-section-title">{section.category}</h2>
              </div>
              <div className="plans-grid">
                {section.items.map((plan) => (
                  <DietCard key={plan.id} plan={plan} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <Newsletter />
      <Footer />
    </div>
  );
};

export default DietPlans;