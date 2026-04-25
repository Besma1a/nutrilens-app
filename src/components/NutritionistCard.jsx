const NutritionistCard = ({ expert }) => {
  const { name, specialty, description, image, experience, rating } = expert;

  const handleBook = () => {
    alert(`Booking consultation with ${name} — coming soon!`);
  };

  return (
    <div className="expert-card" style={styles.card}>
      <div style={styles.imageWrapper}>
        <img src={image} alt={name} style={styles.image} />
      </div>
      <div style={styles.body}>
        <span style={styles.specialty}>{specialty}</span>
        <h3 style={styles.name}>{name}</h3>
        <p style={styles.description}>{description}</p>

        <div style={styles.meta}>
          <span style={styles.metaItem}>⭐ {rating}</span>
          <span style={styles.metaDot}>·</span>
          <span style={styles.metaItem}>{experience} exp</span>
        </div>

        <button onClick={handleBook} style={styles.button}>
          Book Consultation
        </button>
      </div>
    </div>
  );
};

const styles = {
 card: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 2px 14px rgba(0,0,0,0.07)",
    border: "1px solid #f0f0f0",
    display: "flex",
    flexDirection: "column",
    transition: "transform 0.22s ease, box-shadow 0.22s ease",
    height: "100%",
    minHeight: "450px",
    width: "100%",
    boxSizing: "border-box",
  },
  imageWrapper: {
    width: "100%",
    height: "220px",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "top",
    display: "block",
    transition: "transform 0.35s ease",
  },
  body: {
    padding: "22px 24px 26px",
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },
  specialty: {
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    color: "#2B5726",
    backgroundColor: "#f0f7ee",
    border: "1px solid #c8e0c4",
    padding: "3px 10px",
    borderRadius: "20px",
    alignSelf: "flex-start",
    marginBottom: "12px",
    fontFamily: "'DM Sans', sans-serif",
  },
  name: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "18px",
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: "8px",
    lineHeight: "1.3",
  },
  description: {
    fontSize: "14px",
    color: "#777",
    lineHeight: "1.6",
    marginBottom: "14px",
    flex: 1,
    fontFamily: "'DM Sans', sans-serif",
  },
  meta: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "18px",
  },
  metaItem: {
    fontSize: "13px",
    color: "#888",
    fontFamily: "'DM Sans', sans-serif",
  },
  metaDot: {
    color: "#ccc",
    fontSize: "14px",
  },
  button: {
    backgroundColor: "#F19335",
    color: "#ffffff",
    border: "none",
    borderRadius: "50px",
    padding: "10px 20px",
    fontSize: "13px",
    fontWeight: "600",
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
    alignSelf: "flex-start",
    transition: "background-color 0.2s ease",
  },
};

// Hover styles
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    .expert-card:hover {
      transform: translateY(-4px) !important;
      box-shadow: 0 10px 30px rgba(0,0,0,0.11) !important;
    }
    .expert-card:hover img {
      transform: scale(1.04);
    }
    .expert-card button:hover {
      background-color: #d97d1e !important;
    }
  `;
  document.head.appendChild(style);
}

export default NutritionistCard;
