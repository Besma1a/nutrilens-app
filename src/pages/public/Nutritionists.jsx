import Header from "./Header";
import Footer from "./Footer";
import NutritionistCard from "../../components/NutritionistCard";
import Newsletter from "./Newsletter";

const EXPERTS = [
  {
    id: 1,
    name: "Dr. Sarah Mitchell",
    specialty: "Clinical Nutrition",
    description: "Specializes in therapeutic diets for chronic health conditions.",
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&q=80",
    experience: "8 years",
    rating: "4.9",
  },
  {
    id: 2,
    name: "Dr. Amir Hassan",
    specialty: "Diabetes Care",
    description: "Expert in blood sugar management and insulin-friendly meal plans.",
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&q=80",
    experience: "12 years",
    rating: "4.8",
  },
  {
    id: 3,
    name: "Lena Hoffmann",
    specialty: "Weight Management",
    description: "Helps clients achieve sustainable weight loss through balanced eating.",
    image: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=600&q=80",
    experience: "6 years",
    rating: "4.7",
  },
  {
    id: 4,
    name: "Dr. Fatima Al-Rashid",
    specialty: "Sports Nutrition",
    description: "Designs performance-focused plans for athletes and active individuals.",
    image: "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=600&q=80",
    experience: "9 years",
    rating: "4.9",
  },
  {
    id: 5,
    name: "James Okafor",
    specialty: "Plant-Based Nutrition",
    description: "Guides clients toward whole-food, plant-based lifestyles with ease.",
    image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=600&q=80",
    experience: "5 years",
    rating: "4.8",
  },
  {
    id: 6,
    name: "Dr. Nour Khalil",
    specialty: "Pediatric Nutrition",
    description: "Supports healthy growth and development through child-focused nutrition.",
    image: "https://images.unsplash.com/photo-1638202993928-7267aad84c31?w=600&q=80",
    experience: "10 years",
    rating: "5.0",
  },
];

const Nutritionists = () => {
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
          </div>
        </div>

        <div style={styles.container}>
          <div className="experts-grid">
            {EXPERTS.map((expert) => (
              <NutritionistCard key={expert.id} expert={expert} />
            ))}
          </div>
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