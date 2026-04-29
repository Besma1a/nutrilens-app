import { Link } from "react-router-dom";

const BlogCard = ({ article }) => {
  const { id, title, description, image, category, date } = article;

  return (
    <Link to={`/blog/${id}`} style={{ textDecoration: "none" }}>
      <div style={styles.card}>
        <div style={styles.imageWrapper}>
          <img src={image} alt={title} style={styles.image} />
          {category && <span style={styles.category}>{category}</span>}
        </div>
        <div style={styles.body}>
          <p style={styles.date}>{date}</p>
          <h3 style={styles.title}>{title}</h3>
          <p style={styles.description}>{description}</p>
          <span style={styles.readMore}>Read More →</span>
        </div>
      </div>
    </Link>
  );
};

const styles = {
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    overflow: "hidden",
    boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
    border: "1px solid #f0f0f0",
    transition: "transform 0.22s ease, box-shadow 0.22s ease",
    cursor: "pointer",
    height: "100%",
    minHeight: "400px",
    display: "flex",
    flexDirection: "column",
  },
  imageWrapper: {
    position: "relative",
    width: "100%",
    height: "200px",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    transition: "transform 0.35s ease",
  },
  category: {
    position: "absolute",
    top: "12px",
    left: "12px",
    backgroundColor: "#2B5726",
    color: "#fff",
    fontSize: "11px",
    fontWeight: "600",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    padding: "4px 10px",
    borderRadius: "20px",
  },
  body: {
    padding: "20px 22px 24px",
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },
  date: {
    fontSize: "12px",
    color: "#aaa",
    marginBottom: "8px",
    fontFamily: "'DM Sans', sans-serif",
  },
  title: {
    fontSize: "17px",
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: "10px",
    lineHeight: "1.45",
    fontFamily: "'Playfair Display', serif",
  },
  description: {
    fontSize: "14px",
    color: "#666",
    lineHeight: "1.65",
    marginBottom: "18px",
    flex: 1,
    fontFamily: "'DM Sans', sans-serif",
  },
  readMore: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#F19335",
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: "0.02em",
  },
};

// Hover effect via CSS injection
if (typeof document !== "undefined") {
  const styleTag = document.createElement("style");
  styleTag.textContent = `
    a > div[style] {
      transition: transform 0.22s ease, box-shadow 0.22s ease;
    }
    a:hover > div {
      transform: translateY(-4px);
      box-shadow: 0 8px 28px rgba(0,0,0,0.12) !important;
    }
    a:hover img {
      transform: scale(1.04);
    }
  `;
  document.head.appendChild(styleTag);
}

export default BlogCard;
