import Header from "../Header";
import { useEffect, useMemo, useState } from "react";
import BlogCard from "../../../components/blog/BlogCard";
import Newsletter from "../Newsletter";
import Footer from "../Footer";
import { blogsApi } from "../../../services/api";

const Blog = () => {
  const [search, setSearch] = useState("");
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    blogsApi
      .list()
      .then((data) => {
        if (!active) return;
        setArticles(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || "Failed to load articles.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(
    () =>
      articles
        .map((a) => ({
          id: String(a.id),
          title: a.title,
          description: a.excerpt || (a.content || "").slice(0, 170),
          image: a.imageUrl || "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&q=80",
          category: "Nutrition",
          date: new Date(a.createdAt).toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
            year: "numeric",
          }),
        }))
        .filter(
          (a) =>
            a.title.toLowerCase().includes(search.toLowerCase()) ||
            a.category.toLowerCase().includes(search.toLowerCase())
        ),
    [articles, search]
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
          {loading ? (
            <div style={styles.empty}>
              <p style={styles.emptyText}>Loading articles...</p>
            </div>
          ) : error ? (
            <div style={styles.empty}>
              <p style={styles.emptyText}>{error}</p>
            </div>
          ) : filtered.length > 0 ? (
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