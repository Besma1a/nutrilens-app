import { useState, useMemo, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  User,
  Ruler,
  UtensilsCrossed,
  HeartPulse,
  Stethoscope,
  CircleCheck,
  ChevronLeft,
  ChevronRight,
  Check,
  Lightbulb,
  Shield,
  Target,
} from "lucide-react";

const TOTAL_STEPS = 6;
import { useAuth } from '../../context/AuthContext';
import { saveHealthSetup } from '../../services/api';

const DIET_STYLES = [
  "Mediterranean",
  "Low-Carb",
  "Keto",
  "Vegan",
  "Paleo",
  "Balanced",
  "High-Protein",
  "Gluten-Free",
];

const ACTIVITY_LVLS = [
  "Sedentary",
  "Lightly Active",
  "Moderately Active",
  "Very Active",
  "Extremely Active",
];

const PRIMARY_GOALS = [
  {
    value: "Lose Weight",
    title: "Lose",
    desc: "Calorie-aware plan with a sustainable deficit and strength-preserving protein.",
  },
  {
    value: "Maintain Weight",
    title: "Maintain",
    desc: "Balanced energy intake to hold your weight while improving habits and fitness.",
  },
  {
    value: "Gain Muscle",
    title: "Gain",
    desc: "Progressive training support with a measured surplus and recovery focus.",
  },
];

const HS_CSS = `
.hs{min-height:100dvh;background:#eef2f6;color:#0f172a;font-family:var(--font-b),system-ui,sans-serif;padding:28px 20px 48px;box-sizing:border-box;}
.hs *{box-sizing:border-box;}
.hs-inner{max-width:720px;margin:0 auto;}
.hs-title{text-align:center;font-family:var(--font),system-ui,sans-serif;font-size:clamp(1.15rem,2.5vw,1.45rem);font-weight:800;color:#0f172a;letter-spacing:-0.35px;line-height:1.35;margin:0 0 20px;}
.hs-progress-row{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:8px;font-size:13px;font-weight:600;color:#475569;}
.hs-progress-row span:last-child{color:var(--g2);}
.hs-bar{height:8px;background:#e2e8f0;border-radius:99px;overflow:hidden;margin-bottom:22px;}
.hs-bar-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,var(--g1),var(--g2));transition:width .35s ease;}
.hs-steps{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;position:relative;padding:0 4px;}
.hs-steps::before{content:'';position:absolute;left:8%;right:8%;top:16px;height:2px;background:#e2e8f0;z-index:0;}
.hs-step{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;min-width:0;max-width:100px;}
.hs-step-circle{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #e2e8f0;background:#fff;color:#94a3b8;transition:all .2s;}
.hs-step.done .hs-step-circle{background:var(--g2);border-color:var(--g2);color:#fff;}
.hs-step.current .hs-step-circle{border-color:var(--g2);color:var(--g2);background:#ecfdf5;box-shadow:0 0 0 3px rgba(34,160,90,.12);}
.hs-step-label{font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;color:#64748b;text-align:center;line-height:1.15;}
.hs-step.done .hs-step-label{color:var(--g-text);}
.hs-step.current .hs-step-label{color:#0f172a;}
.hs-card{background:#fff;border-radius:18px;box-shadow:0 8px 32px rgba(15,23,42,.06);padding:28px 26px 26px;margin-bottom:20px;border:1px solid rgba(15,23,42,.05);}
.hs-q{font-family:var(--font);font-size:1.2rem;font-weight:800;margin:0 0 8px;letter-spacing:-.3px;}
.hs-hint{font-size:13px;color:#64748b;line-height:1.55;margin:0 0 22px;}
.hs-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px 16px;}
.hs-field{display:flex;flex-direction:column;gap:6px;}
.hs-field.span2{grid-column:1/-1;}
.hs-lbl{font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.5px;}
.hs-inp,.hs-sel{height:44px;border:1px solid #e2e8f0;border-radius:10px;padding:0 12px;font-size:14px;font-family:inherit;color:#0f172a;background:#f8fafc;outline:none;transition:border-color .15s,box-shadow .15s;}
.hs-inp:focus,.hs-sel:focus{border-color:var(--g2);background:#fff;box-shadow:0 0 0 3px rgba(34,160,90,.1);}
.hs-ta{min-height:88px;padding:12px;resize:vertical;}
.hs-goals{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;}
@media(max-width:640px){.hs-goals{grid-template-columns:1fr;}}
.hs-goal{border:1px solid #e2e8f0;border-radius:14px;padding:18px 14px;cursor:pointer;text-align:left;background:#fff;transition:border-color .15s,background .15s,box-shadow .15s;position:relative;}
.hs-goal:hover{border-color:#cbd5e1;}
.hs-goal.on{border-color:var(--g2);background:#f0fdf4;box-shadow:0 0 0 1px rgba(34,160,90,.15);}
.hs-goal-ic{width:36px;height:36px;border-radius:10px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;color:#475569;margin-bottom:10px;}
.hs-goal.on .hs-goal-ic{background:#dcfce7;color:var(--g1);}
.hs-goal-t{font-size:15px;font-weight:800;margin:0 0 6px;}
.hs-goal-d{font-size:12px;color:#64748b;line-height:1.45;margin:0;}
.hs-goal-check{position:absolute;top:10px;right:10px;width:22px;height:22px;border-radius:50%;background:var(--g2);color:#fff;display:none;align-items:center;justify-content:center;}
.hs-goal.on .hs-goal-check{display:flex;}
.hs-refine{background:#f8fafc;border-radius:14px;padding:18px 16px;border:1px solid #e2e8f0;margin-top:8px;}
.hs-refine-title{font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.5px;margin-bottom:14px;}
.hs-numrow{display:flex;align-items:center;gap:10px;}
.hs-numbtn{width:40px;height:40px;border-radius:10px;border:1px solid #e2e8f0;background:#fff;font-size:18px;font-weight:700;cursor:pointer;color:#334155;}
.hs-numbtn:hover{border-color:var(--g2);color:var(--g1);}
.hs-numval{flex:1;text-align:center;font-weight:800;font-size:17px;}
.hs-actions{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:8px;flex-wrap:wrap;}
.hs-back{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:10px;border:1px solid #e2e8f0;background:#f1f5f9;font-size:14px;font-weight:600;color:#334155;cursor:pointer;font-family:inherit;}
.hs-back:hover{background:#e2e8f0;}
.hs-next{display:inline-flex;align-items:center;gap:8px;padding:12px 22px;border-radius:10px;border:none;background:linear-gradient(135deg,var(--g1),var(--g2));color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:var(--font);box-shadow:0 2px 10px rgba(34,160,90,.28);}
.hs-next:hover{filter:brightness(1.03);}
.hs-next:disabled{opacity:.5;cursor:not-allowed;filter:none;}
.hs-tips{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;}
@media(max-width:560px){.hs-tips{grid-template-columns:1fr;}}
.hs-tip{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:14px 16px;display:flex;gap:12px;align-items:flex-start;}
.hs-tip svg{flex-shrink:0;margin-top:2px;}
.hs-tip p{margin:0;font-size:12.5px;color:#475569;line-height:1.5;}
.hs-tip strong{display:block;font-size:12px;font-weight:700;color:#0f172a;margin-bottom:4px;}
.hs-foot{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;padding-top:8px;border-top:1px solid #e2e8f0;margin-top:4px;font-size:12px;color:#64748b;}
.hs-brand{font-family:var(--font);font-weight:800;color:var(--g2);letter-spacing:-.2px;}
.hs-foot a{color:#64748b;text-decoration:none;}
.hs-foot a:hover{color:var(--g2);text-decoration:underline;}
.hs-bmi{font-size:13px;color:#64748b;margin-top:4px;}
.hs-bmi.span2{grid-column:1/-1;}
.hs-rev-block{margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #f1f5f9;}
.hs-rev-block:last-child{border-bottom:none;margin-bottom:0;padding-bottom:0;}
.hs-rev-h{font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;}
.hs-rev-t{font-size:14px;font-weight:600;color:#0f172a;}
.hs-med-sec{margin-bottom:22px;}
.hs-med-sec:last-of-type{margin-bottom:0;}
.hs-med-h{font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;}
.hs-med-list{list-style:none;margin:0 0 12px;padding:0;}
.hs-med-li{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:8px;font-size:13px;}
.hs-med-li span{min-width:0;}
.hs-med-rm{border:none;background:transparent;color:#94a3b8;cursor:pointer;font-size:12px;font-weight:600;flex-shrink:0;}
.hs-med-rm:hover{color:#64748b;}
.hs-add-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:6px;}
.hs-add-row .hs-inp{flex:1;min-width:140px;}
.hs-btn-add{padding:0 16px;height:44px;border-radius:10px;border:1px solid var(--g2);background:#ecfdf5;color:var(--g1);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;}
.hs-btn-add:hover{background:#d1fae5;}
.hs-tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;}
.hs-tag{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;background:#fef3c7;color:#92400e;font-size:13px;font-weight:600;}
.hs-tag-rm{border:none;background:transparent;cursor:pointer;color:inherit;padding:0 2px;line-height:1;font-size:14px;}
`;

const STEP_META = [
  { label: "Basics", Icon: User },
  { label: "Body", Icon: Ruler },
  { label: "Nutrition", Icon: UtensilsCrossed },
  { label: "Lifestyle", Icon: HeartPulse },
  { label: "Health", Icon: Stethoscope },
  { label: "Review", Icon: CircleCheck },
];

function bmiLabel(hCm, wKg) {
  const h = parseFloat(hCm) / 100;
  if (!h || !wKg) return null;
  const raw = parseFloat(wKg) / (h * h);
  if (!Number.isFinite(raw)) return null;
  let lbl = "Normal range";
  if (raw < 18.5) lbl = "Underweight range";
  else if (raw >= 30) lbl = "Obese range";
  else if (raw >= 25) lbl = "Overweight range";
  return `BMI about ${raw.toFixed(1)} (${lbl})`;
}

function formFromUser(u) {
  if (!u) {
    return {
      firstName: "",
      lastName: "",
      email: "",
      dob: "",
      gender: "Female",
      location: "",
      height: "",
      weight: "",
      goalWeight: "",
      bodyFat: "",
      dietStyle: "Balanced",
      goalDesc: "",
      goalType: "Maintain Weight",
      activityLevel: "Moderately Active",
      sleepTargetHours: 7.5,
      conditions: [],
      medications: [],
      allergies: [],
    };
  }
  return {
    firstName: u.firstName || u.name?.split(" ")[0] || "",
    lastName: u.lastName || u.name?.split(" ").slice(1).join(" ") || "",
    email: u.email || "",
    dob: u.dob || "",
    gender: u.gender || "Female",
    location: u.location || "",
    height: u.stats?.height != null ? String(u.stats.height) : "",
    weight: u.stats?.currentWeight != null ? String(u.stats.currentWeight) : "",
    goalWeight: u.stats?.goalWeight != null ? String(u.stats.goalWeight) : "",
    bodyFat: u.stats?.bodyFat != null ? String(u.stats.bodyFat) : "",
    dietStyle: u.dietStyle || "Balanced",
    goalDesc: u.goalDesc || "",
    goalType: u.goalType || "Maintain Weight",
    activityLevel: u.activityLevel || "Moderately Active",
    sleepTargetHours: u.sleepTargetHours != null ? Number(u.sleepTargetHours) : 7.5,
    conditions: Array.isArray(u.medicalConditions) ? [...u.medicalConditions] : [],
    medications: Array.isArray(u.medications) ? [...u.medications] : [],
    allergies: Array.isArray(u.allergies) ? [...u.allergies] : [],
  };
}

export default function HealthSetupPage() {
  const { user, completeHealthOnboarding } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(() => formFromUser(user));
  const [condName, setCondName] = useState("");
  const [condDetail, setCondDetail] = useState("");
  const [medName, setMedName] = useState("");
  const [medDetail, setMedDetail] = useState("");
  const [allergyInput, setAllergyInput] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.onboardingComplete) {
      navigate("/user/dashboard", { replace: true });
    }
  }, [user?.onboardingComplete, navigate]);

  const pct = Math.round((step / TOTAL_STEPS) * 100);
  const bmiNote = useMemo(() => bmiLabel(form.height, form.weight), [form.height, form.weight]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const addCondition = () => {
    const name = condName.trim();
    if (!name) return;
    setForm((f) => ({
      ...f,
      conditions: [
        ...f.conditions,
        { id: Date.now(), name, detail: condDetail.trim() || "Noted during setup", status: "Active" },
      ],
    }));
    setCondName("");
    setCondDetail("");
  };

  const removeCondition = (id) => {
    setForm((f) => ({ ...f, conditions: f.conditions.filter((c) => c.id !== id) }));
  };

  const addMedication = () => {
    const name = medName.trim();
    if (!name) return;
    setForm((f) => ({
      ...f,
      medications: [...f.medications, { id: Date.now(), name, detail: medDetail.trim() || "As prescribed" }],
    }));
    setMedName("");
    setMedDetail("");
  };

  const removeMedication = (id) => {
    setForm((f) => ({ ...f, medications: f.medications.filter((m) => m.id !== id) }));
  };

  const addAllergy = () => {
    const label = allergyInput.trim();
    if (!label) return;
    setForm((f) => ({ ...f, allergies: [...f.allergies, { id: Date.now(), label }] }));
    setAllergyInput("");
  };

  const removeAllergy = (id) => {
    setForm((f) => ({ ...f, allergies: f.allergies.filter((a) => a.id !== id) }));
  };

  const canNext = () => {
    if (step === 1) {
      return (
        form.firstName.trim() &&
        form.lastName.trim() &&
        form.email.trim() &&
        form.dob &&
        form.gender
      );
    }
    if (step === 2) {
      const h = parseFloat(form.height);
      const w = parseFloat(form.weight);
      return h >= 50 && h <= 250 && w >= 20 && w <= 300;
    }
    if (step === 3) return form.dietStyle && form.goalDesc.trim().length >= 4;
    if (step === 4) return form.goalType && form.activityLevel;
    return true;
  };

  const goNext = () => {
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
  };

  const goBack = () => {
    if (step > 1) setStep((s) => s - 1);
    else navigate("/verify-email", { replace: true });
  };

  const handleFinish = async () => {
    setError("");
    setIsSaving(true);

    try {
      // FIX: send camelCase keys — HealthSetupSerializer now maps them via source=
      const healthData = {
        // Step 1
        firstName:         form.firstName,
        lastName:          form.lastName,
        email:             form.email,
        date_of_birth:     form.dob,         // already snake_case in form
        gender:            form.gender,
        location:          form.location,
        // Step 2
        height:            parseFloat(form.height),
        weight:            parseFloat(form.weight),
        goalWeight:        form.goalWeight  ? parseFloat(form.goalWeight)  : null,
        bodyFat:           form.bodyFat     ? parseFloat(form.bodyFat)     : null,
        // Step 3
        dietStyle:         form.dietStyle,
        goalDesc:          form.goalDesc,
        // Step 4
        goalType:          form.goalType,
        activityLevel:     form.activityLevel,
        sleepTargetHours:  form.sleepTargetHours,
        // Step 5
        medicalConditions: form.conditions,
        medications:       form.medications,
        allergies:         form.allergies,
      };

      // Save to backend
      const response = await saveHealthSetup(healthData);

      // FIX: sync AuthContext from the server response { user: {...} }
      // completeHealthOnboarding now accepts the full server response
      completeHealthOnboarding(response);

      navigate("/user/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Failed to save health setup. Please try again.");
      console.error("Health setup error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const stepHint = [
    "We use this to personalize your dashboard and calculations.",
    "Used for BMI, energy needs, and progress charts in your profile.",
    "Matches the diet style and goal notes on your profile.",
    "Same goal types and activity levels as your profile; sleep helps recovery targets.",
    "Optional but recommended: same sections as Profile Medical. You can add or edit details later.",
    "Confirm everything before entering the app.",
  ][step - 1];

  const backLabels = [
    "Back to verification",
    "Back to basics",
    "Back to body stats",
    "Back to nutrition",
    "Back to lifestyle",
    "Back to health",
  ];

  return (
    <div className="hs">
      <style>{HS_CSS}</style>
      <div className="hs-inner">
        <h1 className="hs-title">Let&apos;s craft your personalized wellness profile.</h1>

        <div className="hs-progress-row">
          <span>
            Step {step} of {TOTAL_STEPS}: {STEP_META[step - 1].label}
          </span>
          <span>{pct}% complete</span>
        </div>
        <div className="hs-bar">
          <div className="hs-bar-fill" style={{ width: `${pct}%` }} />
        </div>

        <div className="hs-steps">
          {STEP_META.map((s, i) => {
            const n = i + 1;
            const done = n < step;
            const current = n === step;
            const Icon = s.Icon;
            return (
              <div key={s.label} className={`hs-step${done ? " done" : ""}${current ? " current" : ""}`}>
                <div className="hs-step-circle">
                  {done ? <Check size={16} strokeWidth={2.5} /> : <Icon size={15} strokeWidth={2} />}
                </div>
                <span className="hs-step-label">{s.label}</span>
              </div>
            );
          })}
        </div>

        <div className="hs-card">
          <h2 className="hs-q">
            {step === 1 && "Tell us about you"}
            {step === 2 && "Tell us about your body"}
            {step === 3 && "Tell us about your nutrition"}
            {step === 4 && "What is your primary goal?"}
            {step === 5 && "Medical history and safety"}
            {step === 6 && "Review and finish"}
          </h2>
          <p className="hs-hint">{stepHint}</p>

          {step === 1 && (
            <div className="hs-grid">
              <div className="hs-field">
                <span className="hs-lbl">First name</span>
                <input className="hs-inp" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} autoComplete="given-name" />
              </div>
              <div className="hs-field">
                <span className="hs-lbl">Last name</span>
                <input className="hs-inp" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} autoComplete="family-name" />
              </div>
              <div className="hs-field span2">
                <span className="hs-lbl">Email</span>
                <input className="hs-inp" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" />
              </div>
              <div className="hs-field">
                <span className="hs-lbl">Date of birth</span>
                <input className="hs-inp" type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)} />
              </div>
              <div className="hs-field">
                <span className="hs-lbl">Gender</span>
                <select className="hs-sel" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                  {["Female", "Male", "Non-binary", "Prefer not to say"].map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div className="hs-field span2">
                <span className="hs-lbl">Location (optional)</span>
                <input className="hs-inp" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="City, country" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="hs-grid">
              <div className="hs-field">
                <span className="hs-lbl">Height (cm)</span>
                <input className="hs-inp" type="number" min={50} max={250} value={form.height} onChange={(e) => set("height", e.target.value)} />
              </div>
              <div className="hs-field">
                <span className="hs-lbl">Current weight (kg)</span>
                <input className="hs-inp" type="number" min={20} max={300} step="0.1" value={form.weight} onChange={(e) => set("weight", e.target.value)} />
              </div>
              <div className="hs-field">
                <span className="hs-lbl">Goal weight (kg)</span>
                <input className="hs-inp" type="number" min={20} max={300} step="0.1" value={form.goalWeight} onChange={(e) => set("goalWeight", e.target.value)} />
              </div>
              <div className="hs-field">
                <span className="hs-lbl">Body fat % (optional)</span>
                <input className="hs-inp" type="number" min={0} max={100} step="0.1" value={form.bodyFat} onChange={(e) => set("bodyFat", e.target.value)} />
              </div>
              {bmiNote && <p className="hs-bmi span2" style={{ gridColumn: "1 / -1" }}>{bmiNote}</p>}
            </div>
          )}

          {step === 3 && (
            <div className="hs-grid">
              <div className="hs-field span2">
                <span className="hs-lbl">Preferred diet style</span>
                <select className="hs-sel" value={form.dietStyle} onChange={(e) => set("dietStyle", e.target.value)}>
                  {DIET_STYLES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="hs-field span2">
                <span className="hs-lbl">Goal description</span>
                <textarea
                  className="hs-inp hs-ta"
                  value={form.goalDesc}
                  onChange={(e) => set("goalDesc", e.target.value)}
                  placeholder="Example: Lose 8 kg in 4 months while keeping strength training 3x per week."
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <>
              <p className="hs-hint" style={{ marginTop: "-12px" }}>
                We align this with your profile goal type and adjust recommendations accordingly.
              </p>
              <div className="hs-goals">
                {PRIMARY_GOALS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    className={`hs-goal${form.goalType === g.value ? " on" : ""}`}
                    onClick={() => set("goalType", g.value)}
                  >
                    <span className="hs-goal-check">
                      <Check size={14} strokeWidth={3} />
                    </span>
                    <div className="hs-goal-ic">
                      <Target size={18} />
                    </div>
                    <div className="hs-goal-t">{g.title}</div>
                    <p className="hs-goal-d">{g.desc}</p>
                  </button>
                ))}
              </div>
              <div className="hs-refine">
                <div className="hs-refine-title">Refine your baseline</div>
                <div className="hs-grid">
                  <div className="hs-field span2">
                    <span className="hs-lbl">Daily activity level</span>
                    <select className="hs-sel" value={form.activityLevel} onChange={(e) => set("activityLevel", e.target.value)}>
                      {ACTIVITY_LVLS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="hs-field span2">
                    <span className="hs-lbl">Sleep target (hours per night)</span>
                    <div className="hs-numrow">
                      <button
                        type="button"
                        className="hs-numbtn"
                        onClick={() => set("sleepTargetHours", Math.max(4, Math.round((form.sleepTargetHours - 0.5) * 2) / 2))}
                        aria-label="Decrease sleep hours"
                      >
                        -
                      </button>
                      <div className="hs-numval">{form.sleepTargetHours}</div>
                      <button
                        type="button"
                        className="hs-numbtn"
                        onClick={() => set("sleepTargetHours", Math.min(12, Math.round((form.sleepTargetHours + 0.5) * 2) / 2))}
                        aria-label="Increase sleep hours"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <p className="hs-hint" style={{ marginTop: "-12px" }}>
                Add anything your care team should know. Leave blank if none apply; you can always update this under Profile.
              </p>
              <div className="hs-med-sec">
                <div className="hs-med-h">Medical conditions</div>
                <ul className="hs-med-list">
                  {form.conditions.map((c) => (
                    <li key={c.id} className="hs-med-li">
                      <span>
                        <strong style={{ display: "block", color: "#0f172a" }}>{c.name}</strong>
                        <span style={{ color: "#64748b", fontSize: 12 }}>{c.detail}</span>
                      </span>
                      <button type="button" className="hs-med-rm" onClick={() => removeCondition(c.id)}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="hs-add-row">
                  <input className="hs-inp" placeholder="Condition name" value={condName} onChange={(e) => setCondName(e.target.value)} />
                  <input className="hs-inp" placeholder="Notes (optional)" value={condDetail} onChange={(e) => setCondDetail(e.target.value)} />
                  <button type="button" className="hs-btn-add" onClick={addCondition}>
                    Add
                  </button>
                </div>
              </div>
              <div className="hs-med-sec">
                <div className="hs-med-h">Current medications</div>
                <ul className="hs-med-list">
                  {form.medications.map((m) => (
                    <li key={m.id} className="hs-med-li">
                      <span>
                        <strong style={{ display: "block", color: "#0f172a" }}>{m.name}</strong>
                        <span style={{ color: "#64748b", fontSize: 12 }}>{m.detail}</span>
                      </span>
                      <button type="button" className="hs-med-rm" onClick={() => removeMedication(m.id)}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="hs-add-row">
                  <input className="hs-inp" placeholder="Medication name" value={medName} onChange={(e) => setMedName(e.target.value)} />
                  <input className="hs-inp" placeholder="Dosage and schedule" value={medDetail} onChange={(e) => setMedDetail(e.target.value)} />
                  <button type="button" className="hs-btn-add" onClick={addMedication}>
                    Add
                  </button>
                </div>
              </div>
              <div className="hs-med-sec">
                <div className="hs-med-h">Allergies and intolerances</div>
                <div className="hs-tags">
                  {form.allergies.map((a) => (
                    <span key={a.id} className="hs-tag">
                      {a.label}
                      <button type="button" className="hs-tag-rm" aria-label={`Remove ${a.label}`} onClick={() => removeAllergy(a.id)}>
                        x
                      </button>
                    </span>
                  ))}
                </div>
                <div className="hs-add-row" style={{ marginTop: 10 }}>
                  <input className="hs-inp" placeholder="e.g. Peanuts, penicillin" value={allergyInput} onChange={(e) => setAllergyInput(e.target.value)} />
                  <button type="button" className="hs-btn-add" onClick={addAllergy}>
                    Add
                  </button>
                </div>
              </div>
            </>
          )}

          {step === 6 && (
            <div>
              {error && (
                <div style={{
                  background: "#fef2f2", border: "1px solid #fecaca",
                  borderRadius: "10px", padding: "12px 16px",
                  marginBottom: "20px", color: "#dc2626", fontSize: "14px"
                }}>
                  {error}
                </div>
              )}
              <div className="hs-rev-block">
                <div className="hs-rev-h">Identity</div>
                <div className="hs-rev-t">
                  {form.firstName} {form.lastName} · {form.email}
                </div>
                <div className="hs-rev-t" style={{ fontWeight: 500, marginTop: 6, fontSize: 13 }}>
                  {form.gender} · DOB {form.dob || "—"}
                  {form.location ? ` · ${form.location}` : ""}
                </div>
              </div>
              <div className="hs-rev-block">
                <div className="hs-rev-h">Body</div>
                <div className="hs-rev-t">
                  {form.height} cm · {form.weight} kg · goal {form.goalWeight || "—"} kg
                  {form.bodyFat ? ` · ${form.bodyFat}% body fat` : ""}
                </div>
              </div>
              <div className="hs-rev-block">
                <div className="hs-rev-h">Nutrition</div>
                <div className="hs-rev-t">{form.dietStyle}</div>
                <div className="hs-rev-t" style={{ fontWeight: 500, marginTop: 6, fontSize: 13 }}>
                  {form.goalDesc}
                </div>
              </div>
              <div className="hs-rev-block">
                <div className="hs-rev-h">Lifestyle</div>
                <div className="hs-rev-t">{form.goalType}</div>
                <div className="hs-rev-t" style={{ fontWeight: 500, marginTop: 6, fontSize: 13 }}>
                  {form.activityLevel} · ~{form.sleepTargetHours} h sleep
                </div>
              </div>
              <div className="hs-rev-block">
                <div className="hs-rev-h">Medical</div>
                <div className="hs-rev-t" style={{ fontWeight: 500, fontSize: 13 }}>
                  {form.conditions.length === 0 && form.medications.length === 0 && form.allergies.length === 0
                    ? "No conditions, medications, or allergies listed."
                    : [
                        form.conditions.length ? `${form.conditions.length} condition(s)` : null,
                        form.medications.length ? `${form.medications.length} medication(s)` : null,
                        form.allergies.length ? `${form.allergies.length} allergy / intolerance` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                </div>
                {(form.conditions.length > 0 || form.medications.length > 0 || form.allergies.length > 0) && (
                  <ul style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: 13, color: "#475569", lineHeight: 1.55 }}>
                    {form.conditions.map((c) => (
                      <li key={`c-${c.id}`}>
                        {c.name}: {c.detail}
                      </li>
                    ))}
                    {form.medications.map((m) => (
                      <li key={`m-${m.id}`}>
                        {m.name} — {m.detail}
                      </li>
                    ))}
                    {form.allergies.map((a) => (
                      <li key={`a-${a.id}`}>Allergy: {a.label}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          <div className="hs-actions">
            <button type="button" className="hs-back" onClick={goBack}>
              <ChevronLeft size={18} />
              {backLabels[step - 1]}
            </button>
            {step < TOTAL_STEPS ? (
              <button type="button" className="hs-next" disabled={!canNext()} onClick={goNext}>
                Next step
                <ChevronRight size={18} />
              </button>
            ) : (
              <button type="button" className="hs-next" disabled={isSaving} onClick={handleFinish}>
                {isSaving ? "Saving..." : "Enter dashboard"}
                {!isSaving && <ChevronRight size={18} />}
              </button>
            )}
          </div>
        </div>

        <div className="hs-tips">
          <div className="hs-tip">
            <Lightbulb size={20} color="#2563eb" strokeWidth={2} />
            <div>
              <strong>Expert tip</strong>
              <p>Consistency matters more than perfection. You can update all of this later under Profile.</p>
            </div>
          </div>
          <div className="hs-tip">
            <Shield size={20} color="var(--g2)" strokeWidth={2} />
            <div>
              <strong>Private and secure</strong>
              <p>Health data is encrypted in transit. Only you and your assigned care team can view it.</p>
            </div>
          </div>
        </div>

        <div className="hs-foot">
          <span className="hs-brand">Nutrilens</span>
          <span>
            <a href="#">Privacy Policy</a>
            {" · "}
            <a href="#">Terms of Service</a>
            {" · "}
            <Link to="/login">Help / Login</Link>
          </span>
        </div>
      </div>
    </div>
  );
}