// ─── CSS Variables ────────────────────────────────────────────────
// --primary:     #2B5726  (Primary Green)
// --accent-dark: #A50C05  (Dark Accent Red)
// --bg-main:     #FEF8E0  (Soft Warm Neutral — large backgrounds)
// --lime:        #DEE660  (Lime — accent only)
// --highlight:   #F19335  (Orange)

export const C = {
  bg:     "#FEF8E0",  // soft warm neutral — hero, page backgrounds
  forest: "#2B5726",  // primary green
  tomato: "#A50C05",  // dark accent red — CTAs, buttons
  lime:   "#DEE660",  // lime accent — badges, icons, chips only
  ochre:  "#F19335",  // orange — secondary accents, footer buttons
  cream:  "#FDF0C0",  // slightly deeper warm for card/alt sections
  white:  "#FFFFFF",
};

// ─── Consultation Cards ───────────────────────────────────────────
export const CONSULTATION_CARDS = [
  {
    title: "Match with an Expert",
    desc: "We pair you with a certified dietitian based on your health goals, dietary preferences, and lifestyle.",
  },
  {
    title: "Virtual Consultation",
    desc: "Face-to-face video sessions from the comfort of your home—just like a real clinic, minus the commute.",
  },
  {
    title: "Ongoing Support",
    desc: "Stay on track with async chat check-ins, weekly plan updates, and 24/7 AI-assisted guidance.",
  },
];

// ─── AI Tracker Features ──────────────────────────────────────────
export const AI_FEATURES = [
  {
    title: "Instant Recognition",
    desc: "Our vision model identifies 2M+ foods in under 0.8 seconds.",
  },
  {
    title: "Portion Estimation",
    desc: "3D depth analysis estimates weight and volume from a single photo.",
  },
  {
    title: "Smart Meal Memory",
    desc: "Learns your preferences and pre-fills your favorite combos automatically.",
  },
  {
    title: "Progress Analytics",
    desc: "Weekly trend reports with actionable insights from your data.",
  },
];

// ─── Testimonials ─────────────────────────────────────────────────
export const TESTIMONIALS = [
  {
    name: "Sarah K.",
    role: "Teacher",
    result: "Down 12lbs in 2 Months",
    text: "The AI scanner changed everything—I finally understand what I'm eating.",
    avatar: "SK",
  },
  {
    name: "Marcus T.",
    role: "Software Engineer",
    result: "Cholesterol dropped 40 pts",
    text: "My dietitian genuinely listened and built a plan around my chaotic schedule.",
    avatar: "MT",
  },
  {
    name: "Aisha N.",
    role: "Nurse",
    result: "Energy levels through the roof",
    text: "I've tried every app. NutriLens is the first one that actually sticks.",
    avatar: "AN",
  },
  {
    name: "Priya M.",
    role: "Marketing Manager",
    result: "Lost 18lbs, kept it off",
    text: "The consultation + AI combo is unbeatable. Worth every penny.",
    avatar: "PM",
  },
  {
    name: "James L.",
    role: "Personal Trainer",
    result: "Lean muscle +8lbs",
    text: "My macro splits are dialed in perfectly now. AI portion tracking is insane.",
    avatar: "JL",
  },
  {
    name: "Elena R.",
    role: "Artist",
    result: "Gut issues resolved in 3 weeks",
    text: "The Mediterranean plan with dietitian support transformed my digestion.",
    avatar: "ER",
  },
];

// ─── FAQ ──────────────────────────────────────────────────────────
export const FAQS = [
  {
    q: "How does the AI calorie tracker work?",
    a: "Our model uses computer vision to identify food items and estimate portion sizes from a single photo. It cross-references a database of 2M+ foods to calculate calories and macros with up to 98% accuracy.",
  },
  {
    q: "Are the dietitians certified?",
    a: "Every dietitian on NutriLens is a Registered Dietitian Nutritionist (RDN) with a minimum of 3 years of clinical or private practice experience. We verify credentials before onboarding.",
  },
  {
    q: "How quickly can I book a consultation?",
    a: "Most members match with an available dietitian within 24 hours. Premium plan holders get same-day appointments.",
  },
  {
    q: "Is my health data secure and private?",
    a: "Yes. Your data is encrypted at rest and in transit, and is never sold to third parties.",
  },
  {
    q: "Can I change my diet plan?",
    a: "Absolutely. Your dietitian can update your plan at any time based on your progress, preferences, or life changes. There are no lock-in periods.",
  },
];

// ─── Footer Columns (HIPAA/GDPR/Press Kit/HIPAA Notice removed) ──
export const FOOTER_COLS = [
  {
    title: "Product",
    links: ["AI Calorie Tracker", "Online Consultation", "Diet Plans", "Progress Reports"],
  },
  {
    title: "Company",
    links: ["About Us", "Blog"],
  },
  {
    title: "Legal",
    links: ["Privacy Policy", "Terms of Service", "Cookie Policy", "Contact Support"],
  },
];
