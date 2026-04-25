import { Link } from "react-router-dom";

const DietCard = ({ plan }) => {
  const { id, name, description, image, tag } = plan;

  return (
    <Link to={`/diet/${id}`} style={{ textDecoration: "none" }}>
      <div className="diet-card" style={styles.card}>
        <div style={styles.imageWrapper}>
          <img src={image} alt={name} style={styles.image} />
          {tag && <span style={styles.tag}>{tag}</span>}
        </div>
        <div style={styles.body}>
          <h3 style={styles.name}>{name}</h3>
          <p style={styles.description}>{description}</p>
          <span style={styles.button}>View Plan →</span>
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
    height: "100%",
    minHeight: "400px",
    display: "flex",
    flexDirection: "column",
    cursor: "pointer",
    transition: "transform 0.22s ease, box-shadow 0.22s ease",
  },
  imageWrapper: {
    position: "relative",
    width: "100%",
    height: "190px",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    transition: "transform 0.35s ease",
  },
  tag: {
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
  name: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "17px",
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: "8px",
    lineHeight: "1.4",
  },
  description: {
    fontSize: "14px",
    color: "#777",
    lineHeight: "1.6",
    marginBottom: "18px",
    flex: 1,
    fontFamily: "'DM Sans', sans-serif",
  },
  button: {
    display: "inline-block",
    fontSize: "13px",
    fontWeight: "600",
    color: "#ffffff",
    backgroundColor: "#F19335",
    padding: "8px 18px",
    borderRadius: "50px",
    fontFamily: "'DM Sans', sans-serif",
    alignSelf: "flex-start",
    transition: "background-color 0.2s ease",
  },
};

// Hover styles
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    .diet-card:hover {
      transform: translateY(-4px) !important;
      box-shadow: 0 8px 28px rgba(0,0,0,0.12) !important;
    }
    .diet-card:hover img {
      transform: scale(1.04);
    }
  `;
  document.head.appendChild(style);
}

export default DietCard;
