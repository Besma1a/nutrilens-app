import { useParams, Link } from "react-router-dom";

const PLANS = {
  "mediterranean": {
    id: "mediterranean",
    name: "Mediterranean Plan",
    tag: "Heart-Healthy",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&q=85",
    intro: "A heart-healthy eating plan inspired by traditional Mediterranean cuisine, rich in healthy fats and fresh ingredients.",
    overview:
      "The Mediterranean diet is one of the most researched eating patterns, consistently linked to heart health, brain function, and longevity. It emphasizes whole foods, healthy fats from olive oil and nuts, plenty of vegetables, and moderate amounts of fish and poultry.",
    guidelines: [
      "Use extra virgin olive oil as your primary cooking fat",
      "Eat vegetables with every meal - aim for 5+ servings daily",
      "Include fish 2-3 times per week for omega-3 fatty acids",
      "Choose whole grains over refined grains when possible",
      "Enjoy moderate amounts of red wine with meals (if you drink)",
    ],
    meals: [
      "Breakfast: Greek yogurt with berries, walnuts, and honey",
      "Lunch: Mediterranean salad with grilled chicken, feta, olives, and olive oil dressing",
      "Snack: Hummus with fresh vegetables and whole-grain pita",
      "Dinner: Baked salmon with roasted vegetables and quinoa pilaf",
    ],
  },
  "keto": {
    id: "keto",
    name: "Keto Plan",
    tag: "Fat-Burning",
    image: "https://images.unsplash.com/photo-1543362906-acfc16c67564?w=1200&q=85",
    intro: "A high-fat, low-carbohydrate eating plan designed to shift your body into ketosis for fat burning.",
    overview:
      "The ketogenic diet drastically reduces carbohydrate intake and replaces it with fat, forcing your body into a metabolic state called ketosis. This makes your body incredibly efficient at burning fat for energy and can lead to significant weight loss and improved mental clarity.",
    guidelines: [
      "Limit net carbs to 20-50g per day to maintain ketosis",
      "Get 70-80% of calories from healthy fats",
      "Eat moderate protein (0.8-1.2g per kg of body weight)",
      "Stay hydrated and electrolyte balance is crucial",
      "Test ketone levels to ensure you're in ketosis",
    ],
    meals: [
      "Breakfast: Bacon and eggs with avocado and spinach",
      "Lunch: Cobb salad with ranch dressing and olive oil",
      "Snack: Cheese and nuts or keto-friendly protein shake",
      "Dinner: Steak with butter sauce and roasted cauliflower",
    ],
  },
  "plant-based": {
    id: "plant-based",
    name: "Plant-Based Plan",
    tag: "Eco-Conscious",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&q=85",
    intro: "A 100% plant-based eating plan focused on whole foods, fiber, and sustainable nutrition.",
    overview:
      "A plant-based diet eliminates all animal products while emphasizing whole plant foods like vegetables, fruits, legumes, nuts, and seeds. This approach provides abundant fiber, antioxidants, and phytonutrients while being environmentally sustainable.",
    guidelines: [
      "Combine different plant proteins to get complete amino acid profiles",
      "Include sources of vitamin B12 (fortified foods or supplements)",
      "Eat iron-rich foods with vitamin C for better absorption",
      "Include healthy fats from nuts, seeds, and avocados",
      "Aim for variety - eat the rainbow of plant foods",
    ],
    meals: [
      "Breakfast: Overnight oats with chia seeds, berries, and almond butter",
      "Lunch: Buddha bowl with quinoa, chickpeas, and roasted vegetables",
      "Snack: Apple slices with almond butter or trail mix",
      "Dinner: Lentil curry with brown rice and steamed greens",
    ],
  },
  "low-sugar": {
    id: "low-sugar",
    name: "Low Sugar Plan",
    tag: "Diabetes-Friendly",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&q=85",
    intro: "A structured eating plan focused on stabilizing blood sugar through low-glycemic, nutrient-rich foods.",
    overview:
      "This plan is designed for individuals managing diabetes or insulin resistance. It emphasizes whole grains, lean proteins, healthy fats, and fiber-rich vegetables while limiting refined sugars and processed carbohydrates. Consistent meal timing is key to keeping glucose levels stable throughout the day.",
    guidelines: [
      "Choose whole grains over refined carbs (oats, quinoa, brown rice)",
      "Include protein in every meal to slow sugar absorption",
      "Avoid sugary drinks, fruit juices, and processed snacks",
      "Eat at consistent times — don't skip meals",
      "Focus on non-starchy vegetables as the base of each plate",
    ],
    meals: [
      "Breakfast: Oatmeal with chia seeds, walnuts, and a few blueberries",
      "Lunch: Grilled chicken salad with avocado, olive oil dressing",
      "Snack: A small handful of almonds with cucumber slices",
      "Dinner: Baked salmon with roasted broccoli and quinoa",
    ],
  },
  "low-sodium": {
    id: "low-sodium",
    name: "Low Sodium Plan",
    tag: "Heart Health",
    image: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1200&q=85",
    intro: "Heart-healthy meals crafted to reduce sodium intake and support healthy blood pressure.",
    overview:
      "Excess sodium contributes to high blood pressure and increases the risk of heart disease. This plan focuses on fresh, whole foods prepared with herbs and spices instead of salt. It avoids processed foods, canned goods, and restaurant meals — the biggest sources of hidden sodium in modern diets.",
    guidelines: [
      "Limit sodium to under 1,500mg per day",
      "Cook at home using fresh herbs, lemon, and garlic instead of salt",
      "Avoid processed meats, canned soups, and packaged sauces",
      "Read nutrition labels — aim for under 200mg sodium per serving",
      "Drink plenty of water to support kidney function",
    ],
    meals: [
      "Breakfast: Scrambled eggs with spinach and tomatoes, no-salt seasoning",
      "Lunch: Homemade lentil soup with fresh herbs and whole-grain bread",
      "Snack: Unsalted rice cakes with mashed avocado",
      "Dinner: Herb-roasted chicken with steamed green beans and sweet potato",
    ],
  },
  "high-fiber": {
    id: "high-fiber",
    name: "High Fiber Plan",
    tag: "Gut Health",
    image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&q=85",
    intro: "A fiber-forward plan to improve digestion, support gut microbiome, and maintain steady energy.",
    overview:
      "Dietary fiber feeds beneficial gut bacteria, improves bowel regularity, and helps maintain a healthy weight. This plan centers around legumes, whole grains, fruits, vegetables, and seeds. Increasing fiber gradually is important — too much too fast can cause bloating.",
    guidelines: [
      "Aim for 25–35g of fiber per day",
      "Increase fiber intake gradually over 1–2 weeks",
      "Drink at least 8 glasses of water daily",
      "Include both soluble and insoluble fiber sources",
      "Add legumes (lentils, chickpeas, beans) to meals regularly",
    ],
    meals: [
      "Breakfast: Overnight oats with flaxseeds, apple slices, and cinnamon",
      "Lunch: Chickpea and vegetable stir-fry with brown rice",
      "Snack: Pear with a tablespoon of almond butter",
      "Dinner: Black bean tacos with shredded cabbage and salsa",
    ],
  },
  "ramadan": {
    id: "ramadan",
    name: "Ramadan Plan",
    tag: "Ramadan",
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=85",
    intro: "Balanced Suhoor and Iftar meals to maintain energy, hydration, and nutrition during the holy month.",
    overview:
      "Fasting during Ramadan requires thoughtful nutrition to sustain energy through long hours without food or water. The focus is on slow-digesting foods at Suhoor for lasting energy, and a balanced Iftar to replenish without overeating. Hydration between Iftar and Suhoor is equally important.",
    guidelines: [
      "Start Iftar with dates and water — a natural and traditional way to break fast",
      "Eat Suhoor as close to Fajr as possible",
      "Prioritize complex carbs and protein at Suhoor for sustained energy",
      "Avoid fried and heavily spiced foods at Iftar",
      "Drink 8–10 glasses of water between Iftar and Suhoor",
    ],
    meals: [
      "Suhoor: Whole-grain bread with eggs, labneh, and a piece of fruit",
      "Iftar (break fast): 2–3 dates with water or milk",
      "Iftar (main): Lentil soup, grilled protein, salad, and a small portion of rice",
      "After Tarawih snack: Greek yogurt with honey and a handful of nuts",
    ],
  },
  "weight-loss": {
    id: "weight-loss",
    name: "Weight Loss Plan",
    tag: "Weight Loss",
    image: "https://images.unsplash.com/photo-1543362906-acfc16c67564?w=1200&q=85",
    intro: "A sustainable calorie-conscious plan focused on whole foods and portion control.",
    overview:
      "Sustainable weight loss comes from a moderate calorie deficit combined with high-volume, nutrient-dense foods that keep you full. This plan avoids crash dieting and focuses on building long-term habits. Protein is prioritized to preserve muscle mass while losing fat.",
    guidelines: [
      "Target a 300–500 calorie daily deficit — not more",
      "Eat protein at every meal to stay full and preserve muscle",
      "Fill half your plate with vegetables at lunch and dinner",
      "Limit liquid calories — water, herbal tea, and black coffee only",
      "Plan meals ahead to avoid impulsive food choices",
    ],
    meals: [
      "Breakfast: 2 boiled eggs with sliced tomatoes and whole-grain toast",
      "Lunch: Large salad with grilled chicken, olive oil, and lemon",
      "Snack: Apple slices with a tablespoon of peanut butter",
      "Dinner: Baked cod with roasted zucchini and cauliflower rice",
    ],
  },
  "muscle-gain": {
    id: "muscle-gain",
    name: "Muscle Gain Plan",
    tag: "Active Lifestyle",
    image: "https://images.unsplash.com/photo-1547496502-affa22e38b2d?w=1200&q=85",
    intro: "A high-protein, calorie-sufficient plan to fuel workouts and support muscle growth.",
    overview:
      "Building muscle requires both a slight calorie surplus and adequate protein intake — typically 1.6–2.2g per kg of body weight. This plan distributes protein evenly across meals and includes complex carbohydrates to fuel training sessions and support recovery.",
    guidelines: [
      "Eat every 3–4 hours to maintain positive protein balance",
      "Consume 30–40g of protein per meal for optimal muscle synthesis",
      "Time carbohydrates around workouts for maximum energy",
      "Don't neglect healthy fats — they support hormone production",
      "Prioritize sleep and recovery as much as nutrition",
    ],
    meals: [
      "Breakfast: Oatmeal with protein powder, banana, and peanut butter",
      "Lunch: Grilled beef or chicken with rice and roasted vegetables",
      "Pre-workout snack: Greek yogurt with granola and berries",
      "Dinner: Salmon with sweet potato and steamed broccoli",
    ],
  },
  "low-sodium": {
    id: "low-sodium",
    name: "Low Sodium Plan",
    tag: "Heart Health",
    image: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1200&q=85",
    intro: "Heart-healthy meals crafted to reduce sodium intake and support healthy blood pressure.",
    overview:
      "Excess sodium contributes to high blood pressure and increases the risk of heart disease. This plan focuses on fresh, whole foods prepared with herbs and spices instead of salt. It avoids processed foods, canned goods, and restaurant meals — the biggest sources of hidden sodium in modern diets.",
    guidelines: [
      "Limit sodium to under 1,500mg per day",
      "Cook at home using fresh herbs, lemon, and garlic instead of salt",
      "Avoid processed meats, canned soups, and packaged sauces",
      "Read nutrition labels — aim for under 200mg sodium per serving",
      "Drink plenty of water to support kidney function",
    ],
    meals: [
      "Breakfast: Scrambled eggs with spinach and tomatoes, no-salt seasoning",
      "Lunch: Homemade lentil soup with fresh herbs and whole-grain bread",
      "Snack: Unsalted rice cakes with mashed avocado",
      "Dinner: Herb-roasted chicken with steamed green beans and sweet potato",
    ],
  },
  "high-fiber": {
    id: "high-fiber",
    name: "High Fiber Plan",
    tag: "Gut Health",
    image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&q=85",
    intro: "A fiber-forward plan to improve digestion, support gut microbiome, and maintain steady energy.",
    overview:
      "Dietary fiber feeds beneficial gut bacteria, improves bowel regularity, and helps maintain a healthy weight. This plan centers around legumes, whole grains, fruits, vegetables, and seeds. Increasing fiber gradually is important — too much too fast can cause bloating.",
    guidelines: [
      "Aim for 25–35g of fiber per day",
      "Increase fiber intake gradually over 1–2 weeks",
      "Drink at least 8 glasses of water daily",
      "Include both soluble and insoluble fiber sources",
      "Add legumes (lentils, chickpeas, beans) to meals regularly",
    ],
    meals: [
      "Breakfast: Overnight oats with flaxseeds, apple slices, and cinnamon",
      "Lunch: Chickpea and vegetable stir-fry with brown rice",
      "Snack: Pear with a tablespoon of almond butter",
      "Dinner: Black bean tacos with shredded cabbage and salsa",
    ],
  },
  "ramadan": {
    id: "ramadan",
    name: "Ramadan Plan",
    tag: "Ramadan",
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=85",
    intro: "Balanced Suhoor and Iftar meals to maintain energy, hydration, and nutrition during the holy month.",
    overview:
      "Fasting during Ramadan requires thoughtful nutrition to sustain energy through long hours without food or water. The focus is on slow-digesting foods at Suhoor for lasting energy, and a balanced Iftar to replenish without overeating. Hydration between Iftar and Suhoor is equally important.",
    guidelines: [
      "Start Iftar with dates and water — a natural and traditional way to break fast",
      "Eat Suhoor as close to Fajr as possible",
      "Prioritize complex carbs and protein at Suhoor for sustained energy",
      "Avoid fried and heavily spiced foods at Iftar",
      "Drink 8–10 glasses of water between Iftar and Suhoor",
    ],
    meals: [
      "Suhoor: Whole-grain bread with eggs, labneh, and a piece of fruit",
      "Iftar (break fast): 2–3 dates with water or milk",
      "Iftar (main): Lentil soup, grilled protein, salad, and a small portion of rice",
      "After Tarawih snack: Greek yogurt with honey and a handful of nuts",
    ],
  },
  "weight-loss": {
    id: "weight-loss",
    name: "Weight Loss Plan",
    tag: "Weight Loss",
    image: "https://images.unsplash.com/photo-1543362906-acfc16c67564?w=1200&q=85",
    intro: "A sustainable calorie-conscious plan focused on whole foods and portion control.",
    overview:
      "Sustainable weight loss comes from a moderate calorie deficit combined with high-volume, nutrient-dense foods that keep you full. This plan avoids crash dieting and focuses on building long-term habits. Protein is prioritized to preserve muscle mass while losing fat.",
    guidelines: [
      "Target a 300–500 calorie daily deficit — not more",
      "Eat protein at every meal to stay full and preserve muscle",
      "Fill half your plate with vegetables at lunch and dinner",
      "Limit liquid calories — water, herbal tea, and black coffee only",
      "Plan meals ahead to avoid impulsive food choices",
    ],
    meals: [
      "Breakfast: 2 boiled eggs with sliced tomatoes and whole-grain toast",
      "Lunch: Large salad with grilled chicken, olive oil, and lemon",
      "Snack: Apple slices with a tablespoon of peanut butter",
      "Dinner: Baked cod with roasted zucchini and cauliflower rice",
    ],
  },
};

const DietPlanDetail = () => {
  const { id } = useParams();
  const plan = PLANS[id];

  if (!plan) {
    return (
      <div style={styles.notFound}>
        <h2 style={styles.notFoundTitle}>Plan not found</h2>
        <Link to="/diet" style={styles.backLink}>← Back to Diet Plans</Link>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');

        @media (max-width: 640px) {
          .detail-title { font-size: 28px !important; }
          .detail-image { height: 220px !important; }
        }
      `}</style>

      <div style={styles.page}>
        {/* ── Back bar ── */}
        <div style={styles.topBar}>
          <div style={styles.container}>
            <Link to="/diet" style={styles.backLink}>← Back to Diet Plans</Link>
          </div>
        </div>

        <div style={styles.container}>
          {/* ── Header ── */}
          <div style={styles.header}>
            <span style={styles.tag}>{plan.tag}</span>
            <h1 className="detail-title" style={styles.title}>{plan.name}</h1>
            <p style={styles.intro}>{plan.intro}</p>
          </div>

          {/* ── Image ── */}
          <div className="detail-image" style={styles.imageWrapper}>
            <img src={plan.image} alt={plan.name} style={styles.image} />
          </div>

          {/* ── Content ── */}
          <div style={styles.content}>

            {/* Overview */}
            <div style={styles.block}>
              <h2 style={styles.blockTitle}>
                <span style={styles.blockAccent} />
                Overview
              </h2>
              <p style={styles.paragraph}>{plan.overview}</p>
            </div>

            {/* Guidelines */}
            <div style={styles.block}>
              <h2 style={styles.blockTitle}>
                <span style={styles.blockAccent} />
                Key Guidelines
              </h2>
              <ul style={styles.list}>
                {plan.guidelines.map((g, i) => (
                  <li key={i} style={styles.listItem}>
                    <span style={styles.listDot} />
                    {g}
                  </li>
                ))}
              </ul>
            </div>

            {/* Example Meals */}
            <div style={styles.block}>
              <h2 style={styles.blockTitle}>
                <span style={styles.blockAccent} />
                Example Meals
              </h2>
              <div style={styles.mealsGrid}>
                {plan.meals.map((meal, i) => (
                  <div key={i} style={styles.mealCard}>
                    <p style={styles.mealText}>{meal}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ── Footer ── */}
          <div style={styles.footer}>
            <Link to="/diet" style={styles.footerBack}>← More Diet Plans</Link>
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
    display: "block",
    width: "100%",
    boxSizing: "border-box",
  },
  topBar: {
    borderBottom: "1px solid #f0f0f0",
    padding: "16px 24px",
  },
  container: {
    maxWidth: "780px",
    margin: "0 auto",
    padding: "0 24px",
  },
  backLink: {
    fontSize: "14px",
    color: "#888",
    textDecoration: "none",
    fontWeight: "500",
  },
  header: {
    paddingTop: "48px",
    paddingBottom: "28px",
  },
  tag: {
    display: "inline-block",
    backgroundColor: "#f0f7ee",
    color: "#2B5726",
    border: "1px solid #c8e0c4",
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    padding: "4px 10px",
    borderRadius: "20px",
    marginBottom: "16px",
  },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "38px",
    fontWeight: "800",
    color: "#1a1a1a",
    lineHeight: "1.25",
    marginBottom: "14px",
  },
  intro: {
    fontSize: "17px",
    color: "#555",
    lineHeight: "1.75",
    fontWeight: "500",
  },
  imageWrapper: {
    width: "100%",
    height: "380px",
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
    maxWidth: "700px",
    margin: "0 auto",
  },
  block: {
    marginBottom: "40px",
  },
  blockTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "20px",
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: "16px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  blockAccent: {
    display: "inline-block",
    width: "4px",
    height: "20px",
    backgroundColor: "#F19335",
    borderRadius: "4px",
    flexShrink: 0,
  },
  paragraph: {
    fontSize: "15px",
    color: "#555",
    lineHeight: "1.85",
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  listItem: {
    fontSize: "15px",
    color: "#444",
    lineHeight: "1.65",
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
  },
  listDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    backgroundColor: "#2B5726",
    marginTop: "7px",
    flexShrink: 0,
  },
  mealsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px",
  },
  mealCard: {
    backgroundColor: "#fafafa",
    border: "1px solid #f0f0f0",
    borderRadius: "10px",
    padding: "14px 16px",
  },
  mealText: {
    fontSize: "14px",
    color: "#555",
    lineHeight: "1.6",
    margin: 0,
  },
  footer: {
    marginTop: "56px",
    paddingTop: "24px",
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

export default DietPlanDetail;
