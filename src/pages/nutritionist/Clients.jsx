import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, ArrowLeft, TrendingUp, Sliders,
  ChevronRight, User, Calendar, Mail, Heart,
  Pill, AlertCircle, Target, Utensils, BookOpen, Activity,
  Loader
} from "lucide-react";
import { patientsApi } from "../../services/api";

/* ── Design Tokens ── */
const COLORS = {
  primary:      "#2B5726",
  primaryLight: "#f0fdf4",
  blue:         "#2563eb",
  blueLight:    "#dbeafe",
  amber:        "#f59e0b",
  amberLight:   "#fef3c7",
  red:          "#A50C05",
  redLight:     "#fee2e2",
  text:         "#0f172a",
  textSub:      "#6b7280",
  textMuted:    "#9ca3af",
  border:       "#e2e8f0",
  white:        "#ffffff",
  bg:           "#ffffff",
};

const card = {
  background: COLORS.white,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 16,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const badgeMap = {
  green: { background: COLORS.primaryLight, color: COLORS.primary },
  blue:  { background: COLORS.blueLight,    color: COLORS.blue },
  amber: { background: COLORS.amberLight,   color: COLORS.amber },
  red:   { background: COLORS.redLight,     color: COLORS.red },
};
const badge = (type) => ({
  display: "inline-flex", alignItems: "center",
  padding: "4px 12px", borderRadius: 999,
  fontSize: 12, fontWeight: 600,
  ...badgeMap[type],
});

const btnBase = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "9px 16px", borderRadius: 10,
  fontSize: 13.5, fontWeight: 600,
  cursor: "pointer", transition: "opacity 0.15s, transform 0.1s",
  border: "none",
};
const btnVariants = {
  primary: { background: COLORS.primary,      color: "#fff" },
  blue:    { background: COLORS.blue,          color: "#fff" },
  success: { background: COLORS.primaryLight,  color: COLORS.primary, border: "1px solid #a7f3d0" },
  outline: { background: "#fff",               color: "#374151", border: `1px solid ${COLORS.border}` },
};
const btn = (v = "primary") => ({ ...btnBase, ...btnVariants[v] });

const selStyle = {
  height: 42, border: `1px solid ${COLORS.border}`,
  borderRadius: 10, padding: "0 12px",
  fontSize: 13.5, background: COLORS.white,
  color: "#374151", cursor: "pointer", outline: "none",
};

const inputStyle = {
  width: "100%", height: 48,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10, padding: "0 14px",
  fontSize: 14.5, color: COLORS.text,
  background: COLORS.bg, outline: "none",
  boxSizing: "border-box",
};

const toArray = (...sources) => {
  for (const src of sources) {
    if (Array.isArray(src)) return src;
  }
  return [];
};

function useDebounce(value, delay = 280) {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

/* ── BMI helpers ── */
function calcBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  const h = heightCm / 100;
  return (weightKg / (h * h)).toFixed(1);
}
function bmiCategory(bmi) {
  if (!bmi) return { label: "—", color: COLORS.textMuted };
  const v = parseFloat(bmi);
  if (v < 18.5) return { label: "Underweight", color: COLORS.blue };
  if (v < 25)   return { label: "Normal",       color: COLORS.primary };
  if (v < 30)   return { label: "Overweight",   color: COLORS.amber };
  return              { label: "Obese",          color: COLORS.red };
}

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export default function Clients() {
  const navigate = useNavigate();
  const [selected, setSelected]       = useState(null);
  const [allPatients, setAllPatients] = useState([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [patientsError, setPatientsError]         = useState("");
  const [search, setSearch]       = useState("");
  const [condFilter, setCond]     = useState("All");
  const [statusFilter, setStatus] = useState("All");
  const [viewMode, setViewMode]   = useState("table");

  const debouncedSearch = useDebounce(search);

  useEffect(() => {
    const goalTypeByLabel = {
      "Lose Weight":     "amber",
      "Gain Weight":     "blue",
      "Maintain Weight": "green",
    };

    const toInitials = (name = "") =>
      name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("") || "P";

    const planLabelByType = {
      standard: "Standard",
      seasonal: "Seasonal",
      ramadan:  "Ramadan",
      medical:  "Medical",
      custom:   "Custom",
    };

    const mapPatient = (p) => {
      const activePlan = p.active_diet_plan || null;
      const activePlanType = activePlan?.plan_type;
      const activePlanTitle = activePlan?.title || "No active plan";

      return {
        id:           p.id,
        name:         p.full_name || "Unknown Patient",
        email:        p.email || "",
        patientCode:  `PT-${String(p.id).padStart(4, "0")}`,
        initials:     toInitials(p.full_name || ""),
        bg:           "linear-gradient(135deg,#4E9A78,#3D8363)",
        // condition / goal
        condition:    p.goal || "Not set",
        condType:     goalTypeByLabel[p.goal] || "green",
        // plan from backend
        planType:     activePlan ? (planLabelByType[activePlanType] || "Standard") : "No Plan",
        plan:         activePlanTitle,
        // real profile fields
        heightCm:         p.height_cm         ?? null,
        weightKg:         p.current_weight_kg ?? null,
        goalWeightKg:     p.goal_weight_kg    ?? null,
        dailyCalorieGoal: p.daily_calorie_goal ?? 2000,
        proteinGoalG:     p.protein_goal_g    ?? 120,
        carbsGoalG:       p.carbs_goal_g      ?? 200,
        fatGoalG:         p.fat_goal_g        ?? 65,
        // personal info
        dob:          p.dob         || null,
        location:     p.location    || null,
        gender:       p.gender      || null,
        phoneNumber:  p.phone_number || p.phoneNumber || null,
        medicalConditions: toArray(
          p.medicalConditions,
          p.medical_conditions,
          p.user?.medicalConditions,
          p.user?.medical_conditions,
          p.profile?.medicalConditions,
          p.profile?.medical_conditions
        ),
        medications: toArray(
          p.medications,
          p.user?.medications,
          p.profile?.medications
        ),
        allergies: toArray(
          p.allergies,
          p.user?.allergies,
          p.profile?.allergies
        ),
        // meta
        hasActivePlan: Boolean(activePlan),
        lastActivity:  p.joined_at
          ? new Date(p.joined_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : "—",
        status:     "Active",
        statusType: "green",
        profilePicture: p.avatar || null,
        activeDietPlan: activePlan,
      };
    };

    const fetchPatients = async () => {
      try {
        setIsLoadingPatients(true);
        setPatientsError("");
        const data = await patientsApi.getManagedPatients();
        const normalized = Array.isArray(data) ? data : [];
        setAllPatients(normalized.map(mapPatient));
      } catch (error) {
        console.error("Failed to fetch patients:", error);
        setPatientsError(error.message || "Unable to load patients.");
        setAllPatients([]);
      } finally {
        setIsLoadingPatients(false);
      }
    };

    fetchPatients();
  }, []);

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return allPatients.filter(p =>
      (!q || p.name.toLowerCase().includes(q) || p.patientCode.toLowerCase().includes(q) || p.condition.toLowerCase().includes(q)) &&
      (condFilter === "All" || p.condition === condFilter) &&
      (statusFilter === "All" || p.status === statusFilter)
    );
  }, [allPatients, debouncedSearch, condFilter, statusFilter]);

  const conditionOptions = useMemo(() => {
    const values = Array.from(new Set(allPatients.map((p) => p.condition).filter(Boolean)));
    return ["All", ...values];
  }, [allPatients]);

  const hasFilter = search || condFilter !== "All" || statusFilter !== "All";

  if (selected) {
    return <PatientProfile patient={selected} onBack={() => setSelected(null)} navigate={navigate} />;
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <div style={{ ...card, padding: "14px 18px", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
            <Search size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: COLORS.textMuted }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, ID, goal…"
              style={{ width: "100%", height: 42, paddingLeft: 40, border: `1px solid ${COLORS.border}`, borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ display: "flex", border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden" }}>
            {["table", "cards"].map(v => (
              <button key={v} onClick={() => setViewMode(v)} style={{
                padding: "9px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer",
                background: viewMode === v ? COLORS.primary : COLORS.white,
                color: viewMode === v ? "#fff" : COLORS.textSub,
                border: "none", borderRight: v === "table" ? `1px solid ${COLORS.border}` : "none",
                textTransform: "capitalize",
              }}>{v}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <select value={condFilter} onChange={e => setCond(e.target.value)} style={selStyle}>
            {conditionOptions.map(o => (
              <option key={o} value={o}>{o === "All" ? "All Goals" : o}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={e => setStatus(e.target.value)} style={selStyle}>
            {["All","Active","At Risk","Off Track"].map(o => (
              <option key={o} value={o}>{o === "All" ? "All Status" : o}</option>
            ))}
          </select>
          {hasFilter && (
            <button onClick={() => { setSearch(""); setCond("All"); setStatus("All"); }} style={btn("outline")}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {isLoadingPatients ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: COLORS.textSub }}>
          <p style={{ margin: 0, fontSize: 15 }}>Loading patients…</p>
        </div>
      ) : viewMode === "table" ? (
        <TableView patients={filtered} onSelect={setSelected} />
      ) : (
        <CardsView patients={filtered} onSelect={setSelected} />
      )}

      {!isLoadingPatients && patientsError && (
        <div style={{ textAlign: "center", padding: "24px 20px", color: COLORS.red }}>
          <p style={{ margin: 0, fontSize: 14 }}>{patientsError}</p>
        </div>
      )}

      {!isLoadingPatients && filtered.length === 0 && !patientsError && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: COLORS.textSub }}>
          <Search size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: 15 }}>No patients match your filters.</p>
        </div>
      )}
    </div>
  );
}

/* ── Table View — no Adherence column ── */
function TableView({ patients, onSelect }) {
  const cols = ["Patient", "Goal", "Plan", "Last Activity", "Status", ""];
  return (
    <div style={{ ...card, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
        <thead>
          <tr style={{ background: COLORS.bg, borderBottom: `1px solid ${COLORS.border}` }}>
            {cols.map(h => (
              <th key={h} style={{ padding: "13px 18px", textAlign: "left", fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.8px", whiteSpace: "nowrap" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {patients.map((p, i) => (
            <tr
              key={p.id}
              onClick={() => onSelect(p)}
              style={{ cursor: "pointer", borderBottom: i < patients.length - 1 ? `1px solid ${COLORS.border}` : "none" }}
              onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
              onMouseLeave={e => e.currentTarget.style.background = COLORS.white}
            >
              <td style={{ padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <Avatar initials={p.initials} bg={p.bg} size={38} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.text }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: COLORS.textMuted }}>{p.patientCode}</div>
                  </div>
                </div>
              </td>
              <td style={{ padding: "14px 18px" }}><span style={badge(p.condType)}>{p.condition}</span></td>
              <td style={{ padding: "14px 18px", fontSize: 14, color: COLORS.textSub }}>{p.plan}</td>
              <td style={{ padding: "14px 18px", fontSize: 13.5, color: COLORS.textSub, whiteSpace: "nowrap" }}>{p.lastActivity}</td>
              <td style={{ padding: "14px 18px" }}><span style={badge(p.statusType)}>{p.status}</span></td>
              <td style={{ padding: "14px 18px" }}>
                <button onClick={e => { e.stopPropagation(); onSelect(p); }} style={{ ...btn("outline"), padding: "6px 13px", fontSize: 12.5 }}>
                  View <ChevronRight size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Cards View — no Adherence ── */
function CardsView({ patients, onSelect }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
      {patients.map(p => (
        <div
          key={p.id}
          onClick={() => onSelect(p)}
          style={{ ...card, padding: 20, cursor: "pointer", transition: "box-shadow 0.2s, transform 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; e.currentTarget.style.transform = "none"; }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <Avatar initials={p.initials} bg={p.bg} size={48} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text }}>{p.name}</div>
              <div style={{ fontSize: 12, color: COLORS.textMuted }}>{p.patientCode}</div>
            </div>
            <span style={badge(p.statusType)}>{p.status}</span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <span style={badge(p.condType)}>{p.condition}</span>
            <span style={{ ...badge("blue"), background: "#f0f9ff" }}>{p.plan}</span>
          </div>
          <div style={{ fontSize: 12.5, color: COLORS.textMuted }}>Last active: {p.lastActivity}</div>
        </div>
      ))}
    </div>
  );
}

function Avatar({ initials, bg, size = 40 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: bg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 700, color: "#fff" }}>
      {initials}
    </div>
  );
}

/* ══════════════════════════════════════════
   PATIENT PROFILE
══════════════════════════════════════════ */
function PatientProfile({ patient: p, onBack, navigate }) {
  const [activeTab, setActiveTab] = useState("personal");

  // Fetch live weight from API to complement serializer data
  const [liveWeight, setLiveWeight]   = useState(null);
  const [weightLoading, setWeightLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setWeightLoading(true);
        const entries = await patientsApi.getWeightHistory(p.id, { limit: 1 });
        if (!cancelled && Array.isArray(entries) && entries.length > 0) {
          setLiveWeight(entries[0].weight_kg);
        }
      } catch {
        // non-fatal — fall back to serializer value
      } finally {
        if (!cancelled) setWeightLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [p.id]);

  const displayWeight  = liveWeight ?? p.weightKg;
  const bmi            = calcBMI(displayWeight, p.heightCm);
  const bmiInfo        = bmiCategory(bmi);

  const tabs = [
    { id: "personal",  label: "Personal", icon: User     },
    { id: "physical",  label: "Physical", icon: Activity },
    { id: "medical",   label: "Medical", icon: Heart },
    { id: "diary",     label: "Food Diary", icon: BookOpen },
  ];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", width: "100%" }}>
      <button onClick={onBack} style={{ ...btn("outline"), marginBottom: 20, fontSize: 13.5 }}>
        <ArrowLeft size={14} /> Back to patients
      </button>

      {/* Profile Header */}
      <div style={{ ...card, padding: "28px 28px 0", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
          <div style={{ position: "relative" }}>
            <Avatar initials={p.initials} bg={p.bg} size={72} />
            <div style={{ position: "absolute", bottom: 2, right: 2, width: 14, height: 14, borderRadius: "50%", background: COLORS.primary, border: "2px solid #fff" }} />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: COLORS.text }}>{p.name}</h2>
            <p style={{ margin: "0 0 10px", fontSize: 13.5, color: COLORS.textSub }}>
              {p.patientCode}
              {p.gender ? ` · ${p.gender}` : ""}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={badge(p.condType)}>{p.condition}</span>
              <span style={badge(p.statusType)}>{p.status}</span>
              {p.hasActivePlan && (
                <span style={badge("green")}>Active Plan</span>
              )}
              {p.activeDietPlan?.title && (
                <span style={{ ...badge("blue"), background: "#eff6ff" }}>{p.activeDietPlan.title}</span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
            {/* Progress → pre-selects this patient via URL param */}
            <button
              onClick={() => navigate(`/nutritionist/progress?patient=${p.id}`)}
              style={{ ...btn("blue"), fontSize: 13 }}
            >
              <TrendingUp size={14} /> Progress
            </button>
            <button
              onClick={() => navigate(`/nutritionist/adjustments?patient=${p.id}`)}
              style={{ ...btn("success"), fontSize: 13 }}
            >
              <Sliders size={14} /> Adjust Plan
            </button>
          </div>
        </div>

        {/* Quick Stats — real data */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", borderTop: `1px solid ${COLORS.border}` }}>
          {[
            {
              label: "Height",
              value: p.heightCm ? `${p.heightCm} cm` : "—",
              color: COLORS.text,
            },
            {
              label: "BMI",
              value: bmi ? `${bmi} — ${bmiInfo.label}` : (weightLoading ? "…" : "—"),
              color: bmiInfo.color,
            },
            {
              label: "Current Weight",
              value: weightLoading
                ? "…"
                : displayWeight
                  ? `${displayWeight} kg`
                  : "—",
              color: COLORS.text,
            },
            {
              label: "Goal Weight",
              value: p.goalWeightKg ? `${p.goalWeightKg} kg` : "—",
              color: COLORS.text,
            },
            {
              label: "Last Active",
              value: p.lastActivity,
              color: COLORS.text,
            },
          ].map(stat => (
            <div key={stat.label} style={{ padding: "16px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 11.5, color: COLORS.textMuted, marginTop: 3 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, marginTop: 8, borderTop: `1px solid ${COLORS.border}`, overflowX: "auto" }}>
          {tabs.map(({ id, label, icon: TabIcon }) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "14px 20px", fontSize: 13.5, fontWeight: 500,
              cursor: "pointer", border: "none", background: "none",
              color: activeTab === id ? COLORS.primary : COLORS.textSub,
              borderBottom: activeTab === id ? `2px solid ${COLORS.primary}` : "2px solid transparent",
              transition: "color 0.15s", whiteSpace: "nowrap",
            }}>
              <TabIcon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "personal" && <PersonalTab patient={p} />}
      {activeTab === "physical"  && <PhysicalTab patient={p} />}
      {activeTab === "medical"   && <MedicalTab patient={p} />}
      {activeTab === "diary"     && <DiaryTab patientId={p.id} />}
    </div>
  );
}

/* ── Personal Tab — personal information ── */
function PersonalTab({ patient: p }) {
  const formatDate = (iso) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("en-GB");
    } catch {
      return iso;
    }
  };

  const [firstName, ...lastNameParts] = p.name.split(" ");
  const lastName = lastNameParts.join(" ");

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Section title="Personal Information" icon={User}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 24px" }}>
          <InfoField label="First Name"    value={firstName || "—"} />
          <InfoField label="Last Name"     value={lastName || "—"} />
          <InfoField label="Email"         value={p.email || "—"} />
          <InfoField label="Phone Number"  value={p.phoneNumber || "—"} />
          <InfoField label="Location"      value={p.location || "—"} />
          <InfoField label="Date of Birth" value={formatDate(p.dob)} />
          <InfoField label="Gender"        value={p.gender || "—"} />
        </div>
      </Section>
    </div>
  );
}

/* ── Physical Tab — body measurements and goals ── */
function PhysicalTab({ patient: p }) {
  const bmi = calcBMI(p.weightKg, p.heightCm);
  const bmiInfo = bmiCategory(bmi);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Section title="Body Measurements" icon={Activity}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 24px" }}>
          <InfoField label="Height (cm)"         value={p.heightCm ? `${p.heightCm}` : "—"} />
          <InfoField label="Current Weight (kg)" value={p.weightKg ? `${p.weightKg}` : "—"} />
          <InfoField label="Goal Weight (kg)"    value={p.goalWeightKg ? `${p.goalWeightKg}` : "—"} />
          <InfoField label="Body Fat (%)"        value={p.bodyFat ? `${p.bodyFat}` : "—"} />
        </div>
        {bmi && (
          <div style={{ marginTop: 16, padding: "14px 18px", background: "#f8fafc", borderRadius: 10, border: `1px solid ${COLORS.border}`, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: bmiInfo.color }}>{bmi}</div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.5px" }}>Body Mass Index</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: bmiInfo.color, marginTop: 2 }}>{bmiInfo.label}</div>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}

function MedicalTab({ patient: p }) {
  const conditions = Array.isArray(p.medicalConditions) ? p.medicalConditions : [];
  const medications = Array.isArray(p.medications) ? p.medications : [];
  const allergies = Array.isArray(p.allergies) ? p.allergies : [];

  const conditionLabel = (entry) => {
    if (typeof entry === "string") return entry || "—";
    return entry?.name || entry?.label || "—";
  };

  const medicationLabel = (entry) => {
    if (typeof entry === "string") return entry || "—";
    return entry?.name || entry?.label || "—";
  };

  const medicationDetail = (entry) => {
    if (typeof entry === "string") return "";
    return entry?.detail || "";
  };

  const allergyLabel = (entry) => {
    if (typeof entry === "string") return entry || "—";
    return entry?.label || entry?.name || "—";
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Section title="Medical Conditions" icon={Heart}>
        {conditions.length === 0 ? (
          <div style={{ color: COLORS.textMuted, fontSize: 13 }}>None listed.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {conditions.map((c, idx) => (
              <div key={`${conditionLabel(c)}-${idx}`} style={{ padding: "12px 14px", background: "#f8fafc", border: `1px solid ${COLORS.border}`, borderRadius: 10, fontSize: 13.5, color: COLORS.text, fontWeight: 600 }}>
                {conditionLabel(c)}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Current Medications" icon={Pill}>
        {medications.length === 0 ? (
          <div style={{ color: COLORS.textMuted, fontSize: 13 }}>None listed.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {medications.map((m, idx) => (
              <div key={`${medicationLabel(m)}-${idx}`} style={{ padding: "12px 14px", background: "#f8fafc", border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
                <div style={{ fontSize: 13.5, color: COLORS.text, fontWeight: 700 }}>{medicationLabel(m)}</div>
                {medicationDetail(m) && (
                  <div style={{ fontSize: 12.5, color: COLORS.textSub, marginTop: 4 }}>{medicationDetail(m)}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Allergies & Intolerances" icon={AlertCircle}>
        {allergies.length === 0 ? (
          <div style={{ color: COLORS.textMuted, fontSize: 13 }}>None listed.</div>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {allergies.map((a, idx) => (
              <span key={`${allergyLabel(a)}-${idx}`} style={{ ...badge("amber"), padding: "6px 14px" }}>
                {allergyLabel(a)}
              </span>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

/* ── Diary Tab — live data from API ── */
function DiaryTab({ patientId }) {
  const [foodLog, setFoodLog]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const today = new Date().toISOString().split("T")[0];
        const meals = await patientsApi.getFoodLogs(patientId, { date: today });

        if (cancelled) return;

        const rows = [];
        (meals || []).forEach(meal => {
          const time = meal.logged_at
            ? new Date(meal.logged_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "";
          if ((meal.food_items || []).length > 0) {
            meal.food_items.forEach(item => rows.push({
              name:     item.name,
              kcal:     Math.round(item.calories || 0),
              mealType: meal.meal_type,
              time,
            }));
          } else if (meal.total_calories > 0) {
            rows.push({ name: `${meal.meal_type} (manual)`, kcal: Math.round(meal.total_calories), mealType: meal.meal_type, time });
          }
        });
        setFoodLog(rows);
      } catch {
        if (!cancelled) setError("Could not load today's diary.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [patientId]);

  const total = foodLog.reduce((s, e) => s + e.kcal, 0);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Section
        title="Today's Food Diary"
        icon={Utensils}
        right={
          foodLog.length > 0
            ? <span style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.primary }}>{total} kcal total</span>
            : null
        }
      >
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.textMuted, fontSize: 13 }}>
            <Loader size={14} style={{ animation: "spin .7s linear infinite" }} />
            Loading diary…
          </div>
        ) : error ? (
          <div style={{ color: COLORS.red, fontSize: 13 }}>{error}</div>
        ) : foodLog.length === 0 ? (
          <div style={{ color: COLORS.textMuted, fontSize: 13, fontStyle: "italic" }}>No meals logged today.</div>
        ) : (
          foodLog.map((e, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 14, padding: "13px 0",
              borderBottom: i < foodLog.length - 1 ? `1px solid ${COLORS.border}` : "none",
            }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: COLORS.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Utensils size={15} color={COLORS.primary} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.text }}>{e.name}</div>
                <div style={{ fontSize: 12.5, color: COLORS.textMuted }}>{e.mealType}{e.time ? ` · ${e.time}` : ""}</div>
              </div>
              <div style={{ fontWeight: 700, color: COLORS.text, fontSize: 14 }}>{e.kcal} kcal</div>
            </div>
          ))
        )}
      </Section>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── Reusable Components ── */
function InfoField({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 14.5, color: COLORS.text, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function LabeledField({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.text, marginBottom: 8 }}>{label}</div>
      <div style={{ ...inputStyle, display: "flex", alignItems: "center", color: COLORS.textSub, background: COLORS.white }}>
        {value}
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 14.5, color: COLORS.text, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function Section({ title, icon: SectionIcon, right, children }) {
  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          {SectionIcon && <SectionIcon size={16} color={COLORS.primary} />}
          <span style={{ fontSize: 14.5, fontWeight: 700, color: COLORS.text }}>{title}</span>
        </div>
        {right}
      </div>
      <div style={{ padding: "18px 22px" }}>{children}</div>
    </div>
  );
}