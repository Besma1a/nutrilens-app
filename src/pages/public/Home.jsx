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
  return (
    <div className="public-page">
      <Header />
      {/* Header is `position: fixed` with height ~72px */}
      <main style={{ paddingTop: 72 }}>
        <Hero />
        <Consultation />
        <AITracker />
        <DietPlans />
        <PricingSection />
        <Testimonials />
        <FAQ />
        
        <Newsletter />
        <Footer />
      </main>
    </div>
  );
}

