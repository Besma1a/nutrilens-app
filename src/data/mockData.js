// ─── MOCK DATA ──────────────────────────────────────────────────────────────
// Improved version with proper ISO 8601 timestamps and better consistency
// Replace with real API calls from src/services/api.js when backend is ready

// Current logged-in nutritionist
export const currentUser = {
  id: "usr_nutritionist_001",
  firstName: "Sara",
  lastName: "Rahman",
  fullName: "Dr. Sara Rahman",
  initials: "SR",
  email: "dr.sara@nutrilens.com",
  phone: "+213 555 0100",
  role: "nutritionist",
  title: "Senior Nutritionist",
  clinic: "NutriLens Clinic, Algiers",
  license: "ALG-NUT-2018-0042",
  experience: "8 years",
  languages: ["Arabic", "French", "English"],
  rating: 4.9,
  patientsCount: 124,
  plansCreated: 320,
  status: "active",
  avatar: null, // null = use initials
};

// Patients list
export const patients = [
  {
    id: "pt_001",
    initials: "LM",
    name: "Laila Mansouri",
    patientCode: "#PT-0041",
    age: 34,
    gender: "F",
    condition: "Diabetes T2",
    condType: "red",
    plan: "Standard · 1800 kcal",
    planType: "Standard",
    adherence: 87,
    lastActivity: "2026-04-03T22:23:00Z", // ISO 8601
    status: "Active",
    statusType: "green",
    bg: "linear-gradient(135deg,#D4736B,#C45E52)",
  },
  {
    id: "pt_002",
    initials: "KA",
    name: "Karim Al-Hassan",
    patientCode: "#PT-0038",
    age: 29,
    gender: "M",
    condition: "Obesity",
    condType: "amber",
    plan: "Standard · 1600 kcal",
    planType: "Standard",
    adherence: 71,
    lastActivity: "2026-04-03T20:58:00Z",
    status: "Active",
    statusType: "green",
    bg: "linear-gradient(135deg,#5A8FBF,#4A7AAF)",
  },
  {
    id: "pt_003",
    initials: "NA",
    name: "Nour Abdalla",
    patientCode: "#PT-0055",
    age: 27,
    gender: "F",
    condition: "PCOS",
    condType: "blue",
    plan: "Medical · 1500 kcal",
    planType: "Medical",
    adherence: 93,
    lastActivity: "2026-04-03T19:58:00Z",
    status: "Active",
    statusType: "green",
    bg: "linear-gradient(135deg,#4E9A78,#3D8363)",
  },
  {
    id: "pt_004",
    initials: "RM",
    name: "Rania Moussa",
    patientCode: "#PT-0062",
    age: 41,
    gender: "F",
    condition: "Hypertension",
    condType: "red",
    plan: "Low-Sodium · 1700 kcal",
    planType: "Medical",
    adherence: 58,
    lastActivity: "2026-04-02T14:30:00Z",
    status: "At Risk",
    statusType: "amber",
    bg: "linear-gradient(135deg,#A06B9A,#8B5A87)",
  },
  {
    id: "pt_005",
    initials: "AK",
    name: "Ahmed Khalil",
    patientCode: "#PT-0071",
    age: 36,
    gender: "M",
    condition: "Obesity",
    condType: "amber",
    plan: "Standard · 2000 kcal",
    planType: "Standard",
    adherence: 42,
    lastActivity: "2026-03-31T10:15:00Z",
    status: "Off Track",
    statusType: "red",
    bg: "linear-gradient(135deg,#5BAA8A,#4A9A7A)",
  },
  {
    id: "pt_006",
    initials: "SP",
    name: "Sara Petrov",
    patientCode: "#PT-0077",
    age: 23,
    gender: "F",
    condition: "Celiac",
    condType: "blue",
    plan: "Gluten-Free · 1800 kcal",
    planType: "Seasonal",
    adherence: 79,
    lastActivity: "2026-04-03T21:58:00Z",
    status: "Active",
    statusType: "green",
    bg: "linear-gradient(135deg,#7B6EA8,#6A5E9A)",
  },
];

// Appointments (with full ISO datetime)
export const appointments = [
  {
    id: "apt_001",
    patientId: "pt_001",
    patientName: "Laila Mansouri",
    initials: "LM",
    datetime: "2026-04-04T09:00:00+01:00", // Algiers timezone (UTC+1)
    type: "Initial Consultation",
    duration: 60,
    badge: "green",
    label: "Confirmed",
    bg: "linear-gradient(135deg,#D4736B,#C45E52)",
  },
  {
    id: "apt_002",
    patientId: "pt_002",
    patientName: "Karim Al-Hassan",
    initials: "KA",
    datetime: "2026-04-04T10:30:00+01:00",
    type: "Progress Review",
    duration: 30,
    badge: "blue",
    label: "Online",
    bg: "linear-gradient(135deg,#5A8FBF,#4A7AAF)",
  },
  {
    id: "apt_003",
    patientId: "pt_003",
    patientName: "Nour Abdalla",
    initials: "NA",
    datetime: "2026-04-04T12:00:00+01:00",
    type: "Plan Adjustment",
    duration: 45,
    badge: "green",
    label: "Confirmed",
    bg: "linear-gradient(135deg,#4E9A78,#3D8363)",
  },
  {
    id: "apt_004",
    patientId: "pt_004",
    patientName: "Rania Moussa",
    initials: "RM",
    datetime: "2026-04-04T14:00:00+01:00",
    type: "Follow-up",
    duration: 30,
    badge: "amber",
    label: "Pending",
    bg: "linear-gradient(135deg,#A06B9A,#8B5A87)",
  },
  {
    id: "apt_005",
    patientId: "pt_005",
    patientName: "Ahmed Khalil",
    initials: "AK",
    datetime: "2026-04-04T15:30:00+01:00",
    type: "Nutrition Check",
    duration: 30,
    badge: "green",
    label: "Confirmed",
    bg: "linear-gradient(135deg,#5BAA8A,#4A9A7A)",
  },
  {
    id: "apt_006",
    patientId: "pt_006",
    patientName: "Sara Petrov",
    initials: "SP",
    datetime: "2026-04-04T17:00:00+01:00",
    type: "Initial Consultation",
    duration: 60,
    badge: "gray",
    label: "Unconfirmed",
    bg: "linear-gradient(135deg,#7B6EA8,#6A5E9A)",
  },
];

// Alerts
export const alerts = [
  {
    id: "alr_001",
    patientId: "pt_005",
    type: "danger",
    message: "Ahmed Khalil has not logged meals for 3 consecutive days. Plan adherence dropped to 42%.",
    timestamp: "2026-04-03T18:45:00Z",
  },
  {
    id: "alr_002",
    patientId: "pt_004",
    type: "warn",
    message: "Rania Moussa exceeded daily calorie target by 680 kcal on Tuesday & Wednesday.",
    timestamp: "2026-04-02T09:12:00Z",
  },
  {
    id: "alr_003",
    patientId: "pt_002",
    type: "warn",
    message: "Karim Al-Hassan missed 2 scheduled meals this week. Weight stalled at plateau.",
    timestamp: "2026-04-01T14:30:00Z",
  },
];

// Activity Feed
export const activityFeed = [
  {
    id: "act_001",
    patientId: "pt_001",
    icon: "utensils",
    bg: "var(--green-light)",
    text: "Laila Mansouri logged today's lunch — Grilled chicken salad, 480 kcal",
    timestamp: "2026-04-03T22:23:00Z",
  },
  {
    id: "act_002",
    patientId: "pt_002",
    icon: "trending",
    bg: "var(--blue-light)",
    text: "Karim Al-Hassan completed weekly weigh-in — 84.2 kg (↓ 0.8 kg)",
    timestamp: "2026-04-03T20:58:00Z",
  },
  // ... add the rest with timestamps similarly
];

// Weekly Calories (example for current week)
export const weeklyCalories = [
  { id: "wc_1", day: "Mon", intake: 1680, target: 1800 },
  { id: "wc_2", day: "Tue", intake: 1790, target: 1800 },
  { id: "wc_3", day: "Wed", intake: 2120, target: 1800 },
  { id: "wc_4", day: "Thu", intake: 1820, target: 1800 },
  { id: "wc_5", day: "Fri", intake: 1710, target: 1800 },
  { id: "wc_6", day: "Sat", intake: 1950, target: 1800 },
  { id: "wc_7", day: "Sun", intake: 1600, target: 1800 },
];

// Diet Plans (template + assigned)
export const dietPlans = [
  { id: "plan_001", name: "Laila — Low Carb Phase 2", kcal: 1800, type: "Standard", patientId: "pt_001" },
  { id: "plan_002", name: "Standard Weight Loss", kcal: 1600, type: "Standard", patientId: null },
  { id: "plan_003", name: "Mediterranean", kcal: 2000, type: "Seasonal", patientId: null },
  { id: "plan_004", name: "Diabetic-Friendly", kcal: 1700, type: "Medical", patientId: null },
  { id: "plan_005", name: "Ramadan Special", kcal: 1900, type: "Ramadan", patientId: null },
  { id: "plan_006", name: "High Protein", kcal: 2200, type: "Standard", patientId: null },
];

// Current Meal Plan (for Laila as example)
export const mealPlan = {
  planId: "plan_001",
  weekStart: "2026-03-30",
  meals: {
    breakfast: [
      { id: "food_001", food: "Whole wheat toast", portion: "2 slices (60g)", kcal: 160, changed: false },
      { id: "food_002", food: "Scrambled eggs", portion: "2 large", kcal: 180, changed: false },
      { id: "food_003", food: "Labneh (low fat)", portion: "2 tbsp", kcal: 40, changed: false },
      { id: "food_004", food: "Orange juice", portion: "150 ml", kcal: 70, changed: false },
    ],
    lunch: [
      { id: "food_005", food: "Grilled chicken breast", portion: "150g", kcal: 248, changed: false },
      { id: "food_006", food: "Whole grain couscous", portion: "½ cup cooked", kcal: 90, changed: true },
      { id: "food_007", food: "Greek salad", portion: "Large bowl", kcal: 140, changed: false },
      { id: "food_008", food: "Olive oil dressing", portion: "1 tbsp", kcal: 82, changed: false },
    ],
    dinner: [
      { id: "food_009", food: "Baked salmon fillet", portion: "130g", kcal: 260, changed: false },
      { id: "food_010", food: "Steamed broccoli", portion: "1 cup", kcal: 55, changed: false },
      { id: "food_011", food: "Quinoa", portion: "⅓ cup dry", kcal: 180, changed: false },
    ],
    snacks: [
      { id: "food_012", food: "Apple", portion: "1 medium", kcal: 95, changed: false },
      { id: "food_013", food: "Almonds (unsalted)", portion: "20g", kcal: 120, changed: false },
      { id: "food_014", food: "Low-fat yogurt", portion: "100g", kcal: 59, changed: false },
    ],
  },
};

// Messages / Conversations
export const messages = [
  {
    id: "conv_001",
    patientId: "pt_001",
    patientName: "Laila Mansouri",
    initials: "LM",
    bg: "linear-gradient(135deg,#D4736B,#C45E52)",
    preview: "Thanks Dr. Sara! I'll try the green tea suggestion 🍵",
    lastMessageAt: "2026-04-03T09:41:00+01:00",
    unread: true,
    chat: [
      { id: "msg_001", from: "patient", text: "...", time: "2026-03-11T08:22:00+01:00" },
      // ... keep your existing messages but convert times to ISO
    ],
  },
  // ... other conversations
];

// Progress Data (for Laila)
export const progressData = {
  patientId: "pt_001",
  weightHistory: [
    { id: "wh_1", date: "2026-01-15", weight: 76.0 },
    { id: "wh_2", date: "2026-01-29", weight: 75.2 },
    // ... etc.
  ],
  // ... other history arrays with proper dates
};