import { useParams, Link } from "react-router-dom";

// ── Mock data (replace with API call / import later) ─────────────────────────
const ARTICLES = {
  "1": {
    id: "1",
    title: "10 High-Protein Breakfasts to Fuel Your Morning",
    category: "Nutrition",
    date: "April 10, 2026",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&q=85",
    content: [
      {
        type: "intro",
        text: "Breakfast is often called the most important meal of the day — and when it's packed with protein, that claim holds up. A high-protein morning meal stabilizes blood sugar, reduces cravings, and keeps you focused until lunch.",
      },
      {
        type: "heading",
        text: "Why Protein at Breakfast Matters",
      },
      {
        type: "paragraph",
        text: "Protein triggers satiety hormones like peptide YY and GLP-1 while suppressing ghrelin — the hunger hormone. Studies show that people who eat 25–30g of protein at breakfast consume significantly fewer calories throughout the day.",
      },
      {
        type: "highlight",
        text: "Aim for at least 25g of protein in your first meal of the day.",
      },
      {
        type: "heading",
        text: "Top 10 High-Protein Breakfast Ideas",
      },
      {
        type: "paragraph",
        text: "1. Greek yogurt parfait with berries and granola — packs up to 20g protein per serving. 2. Scrambled eggs with smoked salmon on whole-grain toast. 3. Cottage cheese bowl with sliced fruit and a drizzle of honey. 4. Protein smoothie with whey, banana, spinach, and almond butter. 5. Overnight oats made with milk and topped with nuts and seeds.",
      },
      {
        type: "paragraph",
        text: "6. Egg muffins baked with vegetables and cheese — perfect for meal prep. 7. Tofu scramble with turmeric, peppers, and spinach for a plant-based option. 8. Smoked turkey and avocado wrap. 9. Quinoa breakfast bowl with poached egg and greens. 10. Chia pudding made with protein-rich hemp milk.",
      },
      {
        type: "heading",
        text: "Making It a Habit",
      },
      {
        type: "paragraph",
        text: "The key to consistency is preparation. Spend 20 minutes on Sunday prepping egg muffins or overnight oats, and you have a high-protein breakfast ready for most of the week. Small habits compound — and a strong morning meal sets a healthy tone for the entire day.",
      },
    ],
  },
  "2": {
    id: "2",
    title: "How to Read a Nutrition Label Like an Expert",
    category: "Education",
    date: "April 5, 2026",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1543362906-acfc16c67564?w=1200&q=85",
    content: [
      {
        type: "intro",
        text: "Nutrition labels are packed with information — but most people only glance at calories. Learning to read the full label transforms how you shop, cook, and eat.",
      },
      {
        type: "heading",
        text: "Start with Serving Size",
      },
      {
        type: "paragraph",
        text: "Everything on the label refers to one serving. If the package contains 2.5 servings and you eat the whole thing, multiply every number by 2.5. This single step changes how most people interpret packaged food.",
      },
      {
        type: "highlight",
        text: "Serving size is the most overlooked — and most important — line on any label.",
      },
      {
        type: "heading",
        text: "What to Prioritize",
      },
      {
        type: "paragraph",
        text: "After serving size, focus on: total calories, added sugars (not total sugars), sodium, fiber, and protein. These five numbers tell you most of what you need to know about whether a food supports your health goals.",
      },
    ],
  },
};

const Article = () => {
  const { id } = useParams();
  const article = ARTICLES[id];

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
              <span style={styles.categoryBadge}>{article.category}</span>
              <span style={styles.metaDivider}>·</span>
              <span style={styles.metaText}>{article.date}</span>
              <span style={styles.metaDivider}>·</span>
              <span style={styles.metaText}>{article.readTime}</span>
            </div>

            <h1 className="article-title" style={styles.title}>
              {article.title}
            </h1>
          </div>

          {/* ── Image ── */}
          <div className="article-image" style={styles.imageWrapper}>
            <img src={article.image} alt={article.title} style={styles.image} />
          </div>

          {/* ── Content ── */}
          <div style={styles.content}>
            {article.content.map((block, i) => {
              if (block.type === "intro") {
                return (
                  <p key={i} style={styles.intro}>
                    {block.text}
                  </p>
                );
              }
              if (block.type === "heading") {
                return (
                  <h2 key={i} style={styles.sectionHeading}>
                    {block.text}
                  </h2>
                );
              }
              if (block.type === "paragraph") {
                return (
                  <p key={i} style={styles.paragraph}>
                    {block.text}
                  </p>
                );
              }
              if (block.type === "highlight") {
                return (
                  <blockquote key={i} style={styles.highlight}>
                    {block.text}
                  </blockquote>
                );
              }
              return null;
            })}
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
