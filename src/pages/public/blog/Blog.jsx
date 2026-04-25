import Header from "../Header";
import { useState } from "react";
import BlogCard from "../../../components/blog/BlogCard";
import Newsletter from "../Newsletter";
import Footer from "../Footer";

const ARTICLES = [
  {
    id: "1",
    title: "10 High-Protein Breakfasts to Fuel Your Morning",
    description: "Start your day right with these easy, protein-packed breakfast ideas that keep you full and energized for hours.",
    image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&q=80",
    category: "Nutrition",
    date: "April 10, 2026",
  },
  {
    id: "2",
    title: "How to Read a Nutrition Label Like an Expert",
    description: "Understanding nutrition labels is the first step to smarter food choices. Here's everything you need to know.",
    image: "https://images.unsplash.com/photo-1543362906-acfc16c67564?w=600&q=80",
    category: "Education",
    date: "April 5, 2026",
  },
  {
    id: "3",
    title: "The Truth About Intermittent Fasting",
    description: "Is intermittent fasting right for you? We break down the science, benefits, and what the research actually says.",
    image: "https://images.unsplash.com/photo-1505253304499-671c55fb57fe?w=600&q=80",
    category: "Diet",
    date: "March 28, 2026",
  },
  {
    id: "4",
    title: "5 Hydration Myths You Should Stop Believing",
    description: "From the 8-glasses rule to sports drinks — we separate fact from fiction on staying properly hydrated.",
    image: "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=600&q=80",
    category: "Wellness",
    date: "March 20, 2026",
  },
  {
    id: "5",
    title: "Plant-Based Protein: Complete Guide for Beginners",
    description: "Going plant-based? Here's how to hit your protein goals without any animal products, with meal ideas included.",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80",
    category: "Nutrition",
    date: "March 14, 2026",
  },
  {
    id: "6",
    title: "Understanding Macros: Carbs, Fats & Proteins Explained",
    description: "Macronutrients are the foundation of any diet. Learn what they do, how much you need, and how to balance them.",
    image: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&q=80",
    category: "Education",
    date: "March 7, 2026",
  },
];

const Blog = () => {
  const [search, setSearch] = useState("");

  const filtered = ARTICLES.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: "block", width: "100%", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        .blog-search:focus {
          outline: none;
          border-color: #F19335 !important;
          box-shadow: 0 0 0 3px rgba(241,147,53,0.15);
        }
        .blog-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 28px;
        }
        @media (max-width: 1024px) {
          .blog-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .blog-grid { grid-template-columns: 1fr; }
          .blog-hero-title { font-size: 36px !important; }
        }
      `}</style>

      <Header />

      <div style={styles.page}>
        <div style={styles.hero}>
          <div style={styles.heroInner}>
            <h1 className="blog-hero-title" style={styles.heroTitle}>
              Food, Science &<br /> Healthy Living
            </h1>
            <p style={styles.heroSub}>
              Evidence-based articles to help you eat smarter and live better.
            </p>
            <div style={styles.searchWrapper}>
              <span style={styles.searchIcon}>🔍</span>
              <input
                type="text"
                className="blog-search"
                placeholder="Search articles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={styles.searchInput}
              />
            </div>
          </div>
        </div>

        <div style={styles.container}>
          {filtered.length > 0 ? (
            <div className="blog-grid">
              {filtered.map((article) => (
                <BlogCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <div style={styles.empty}>
              <p style={styles.emptyText}>No articles found for "{search}"</p>
            </div>
          )}
        </div>
      </div>

      <Newsletter />
      <Footer />
    </div>
  );
};

const styles = {
  page: {
    display: "block",
    width: "100%",
    backgroundColor: "#ffffff",
    fontFamily: "'DM Sans', sans-serif",
  },
  hero: {
    background: "linear-gradient(to bottom, #f9f6f1, #ffffff)",
    borderBottom: "1px solid #f0ece4",
    padding: "90px 24px 56px",
    marginTop: "48px",
    textAlign: "center",
    width: "100%",
    boxSizing: "border-box",
  },
  heroInner: {
    maxWidth: "620px",
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
    marginBottom: "32px",
  },
  searchWrapper: {
    position: "relative",
    maxWidth: "400px",
    margin: "0 auto",
  },
  searchIcon: {
    position: "absolute",
    left: "14px",
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "15px",
    pointerEvents: "none",
  },
  searchInput: {
    width: "100%",
    padding: "12px 16px 12px 42px",
    borderRadius: "50px",
    border: "1.5px solid #e8e8e8",
    fontSize: "14px",
    fontFamily: "'DM Sans', sans-serif",
    color: "#333",
    backgroundColor: "#fff",
    boxSizing: "border-box",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  container: {
    maxWidth: "1140px",
    margin: "0 auto",
    padding: "56px 24px 80px",
  },
  empty: {
    textAlign: "center",
    padding: "60px 0",
  },
  emptyText: {
    color: "#999",
    fontSize: "16px",
  },
};

export default Blog;