import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { blogsApi } from "../../../services/api";

const Article = () => {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    blogsApi
      .getOne(id)
      .then((data) => {
        if (!active) return;
        setArticle(data || null);
      })
      .catch(() => {
        if (!active) return;
        setArticle(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const contentBlocks = useMemo(() => {
    if (!article?.content) return [];
    return String(article.content)
      .split(/\n{2,}/)
      .map((text) => text.trim())
      .filter(Boolean);
  }, [article]);

  if (loading) {
    return (
      <div style={styles.notFound}>
        <h2 style={styles.notFoundTitle}>Loading article...</h2>
      </div>
    );
  }

  if (!article) {
    return (
      <div style={styles.notFound}>
        <h2 style={styles.notFoundTitle}>Article not found</h2>
        <Link to="/blog" style={styles.backLink}>← Back to Blog</Link>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');

        @media (max-width: 640px) {
          .article-title { font-size: 28px !important; }
          .article-image { height: 220px !important; }
        }
      `}</style>

      <div style={styles.page}>
        {/* ── Back ── */}
        <div style={styles.topBar}>
          <div style={styles.container}>
            <Link to="/blog" style={styles.backLink}>
              ← Back to Blog
            </Link>
          </div>
        </div>

        <div style={styles.container}>
          {/* ── Header ── */}
          <div style={styles.header}>
            <div style={styles.meta}>
              <span style={styles.categoryBadge}>Nutrition</span>
              <span style={styles.metaDivider}>·</span>
              <span style={styles.metaText}>
                {new Date(article.createdAt).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>

            <h1 className="article-title" style={styles.title}>
              {article.title}
            </h1>
          </div>

          {/* ── Image ── */}
          <div className="article-image" style={styles.imageWrapper}>
            <img
              src={
                article.imageUrl ||
                "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&q=85"
              }
              alt={article.title}
              style={styles.image}
            />
          </div>

          {/* ── Content ── */}
          <div style={styles.content}>
            {contentBlocks.map((text, i) =>
              i === 0 ? (
                <p key={i} style={styles.intro}>
                  {text}
                </p>
              ) : (
                <p key={i} style={styles.paragraph}>
                  {text}
                </p>
              )
            )}
          </div>

          {/* ── Footer ── */}
          <div style={styles.footer}>
            <Link to="/blog" style={styles.footerBack}>
              ← More Articles
            </Link>
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
  },
  topBar: {
    borderBottom: "1px solid #f0f0f0",
    padding: "16px 24px",
  },
  container: {
    maxWidth: "760px",
    margin: "0 auto",
    padding: "0 24px",
  },
  backLink: {
    fontSize: "14px",
    color: "#888",
    textDecoration: "none",
    fontWeight: "500",
    transition: "color 0.2s",
  },
  header: {
    paddingTop: "48px",
    paddingBottom: "32px",
  },
  meta: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "16px",
    flexWrap: "wrap",
  },
  categoryBadge: {
    backgroundColor: "#f0f7ee",
    color: "#2B5726",
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    padding: "4px 10px",
    borderRadius: "20px",
  },
  metaDivider: {
    color: "#ccc",
    fontSize: "14px",
  },
  metaText: {
    fontSize: "13px",
    color: "#aaa",
  },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "38px",
    fontWeight: "800",
    color: "#1a1a1a",
    lineHeight: "1.25",
    margin: 0,
  },
  imageWrapper: {
    width: "100%",
    height: "400px",
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
    maxWidth: "680px",
    margin: "0 auto",
  },
  intro: {
    fontSize: "18px",
    color: "#444",
    lineHeight: "1.8",
    marginBottom: "32px",
    fontWeight: "500",
  },
  sectionHeading: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "22px",
    fontWeight: "700",
    color: "#1a1a1a",
    marginTop: "40px",
    marginBottom: "14px",
  },
  paragraph: {
    fontSize: "16px",
    color: "#555",
    lineHeight: "1.85",
    marginBottom: "20px",
  },
  highlight: {
    borderLeft: "3px solid #F19335",
    margin: "32px 0",
    padding: "14px 20px",
    backgroundColor: "#fff9f2",
    borderRadius: "0 8px 8px 0",
    fontSize: "16px",
    color: "#333",
    fontStyle: "italic",
    lineHeight: "1.7",
  },
  footer: {
    marginTop: "60px",
    paddingTop: "28px",
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

export default Article;
