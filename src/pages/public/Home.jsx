import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "./Header";
import Hero from "./Hero";
import AITracker from "./AITracker";
import DietPlans from "./DietPlans";
import Consultation from "./Consultation";
import Testimonials from "./Testimonials";
import FAQ from "./FAQ";
import Newsletter from "./Newsletter";
import Footer from "./Footer";
import PricingSection from "../../components/pricing/PricingSection";

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const id = location.state?.scrollTo;
    if (!id) return;
    // Clear via React Router so both native history and RR internal state are wiped
    navigate(location.pathname, { replace: true, state: null });
    const el = document.getElementById(id);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 100);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="public-page">
      <Header />
      {/* Header is `position: fixed` with height ~72px */}
      <main style={{ paddingTop: 72 }}>
        <Hero />
        <Consultation />
        <AITracker />
        <PricingSection />
        <DietPlans />
        <Testimonials />
        <FAQ />

        <Newsletter />
        <Footer />
      </main>
    </div>
  );
}

