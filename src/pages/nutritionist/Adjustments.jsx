import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Save, AlertTriangle, CheckCircle,
  Loader2, TrendingUp, TrendingDown,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import { patientsApi } from "../../services/api";

// ─── CSS ─────────────────────────────────────────────────────────────────────
const STYLES = `
  @keyframes spin   { to { transform: rotate(360deg); } }
  @keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }

  .adj * { box-sizing: border-box; }
  .adj { animation: fadeUp .2s ease; }

  .adj-input {
    height: 40px;
    border: 1.5px solid #e5e7eb;
    border-radius: 8px;
    padding: 0 12px;
    font-size: 13px;
    font-weight: 500;
    color: #111827;
    background: #fff;
    outline: none;
    width: 100%;
    transition: border-color .15s, box-shadow .15s;
    font-family: inherit;
  }
  .adj-input:focus {
    border-color: var(--green, #4e9a78);
    box-shadow: 0 0 0 3px rgba(78,154,120,.1);
  }
  .adj-num {
    height: 48px;
    width: 120px;
    border: 1.5px solid #e5e7eb;
    border-radius: 8px;
    padding: 0 14px;
    font-size: 24px;
    font-weight: 700;
    color: #111827;
    background: #fff;
    outline: none;
    text-align: center;
    transition: border-color .15s, box-shadow .15s;
    font-family: inherit;
  }
  .adj-num:focus {
    border-color: var(--green, #4e9a78);
    box-shadow: 0 0 0 3px rgba(78,154,120,.1);
  }
  .adj-macro {
    height: 40px;
    width: 100%;
    border: 1.5px solid #e5e7eb;
    border-radius: 8px;
    padding: 0 10px;
    font-size: 16px;
    font-weight: 600;
    color: #111827;
    background: #fff;
    outline: none;
    text-align: center;
    transition: border-color .15s, box-shadow .15s;
    font-family: inherit;
  }
  .adj-macro:focus {
    border-color: var(--green, #4e9a78);
    box-shadow: 0 0 0 3px rgba(78,154,120,.1);
  }
  .adj-textarea {
    width: 100%;
    min-height: 78px;
    border: 1.5px solid #e5e7eb;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 13px;
    font-family: inherit;
    color: #374151;
    resize: vertical;
    outline: none;
    transition: border-color .15s, box-shadow .15s;
    background: #fff;
    line-height: 1.6;
  }
  .adj-textarea:focus {
    border-color: var(--green, #4e9a78);
    box-shadow: 0 0 0 3px rgba(78,154,120,.1);
  }
  .adj-textarea::placeholder { color: #9ca3af; }

  .adj-btn-primary {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 0 20px; height: 40px; border-radius: 8px;
    border: none; font-size: 13.5px; font-weight: 600;
    font-family: inherit; cursor: pointer;
    transition: background .15s, opacity .15s, box-shadow .15s;
  }
  .adj-btn-primary:disabled { cursor: not-allowed; opacity: .6; }
  .adj-btn-primary:not(:disabled):hover { box-shadow: 0 4px 14px rgba(78,154,120,.28); }

  .adj-btn-ghost {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 0 14px; height: 40px; border-radius: 8px;
    border: 1.5px solid #e5e7eb; background: #fff;
    font-size: 13px; font-weight: 500; font-family: inherit;
    color: #6b7280; cursor: pointer;
    transition: border-color .15s, color .15s;
  }
  .adj-btn-ghost:hover { border-color: #9ca3af; color: #374151; }

  .macro-seg { transition: width .35s cubic-bezier(.4,0,.2,1); }

  .adj-label {
    font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: .5px;
    color: #6b7280; margin-bottom: 6px; display: block;
  }

  @media (max-width: 640px) {
    .adj-stats-grid { grid-template-columns: 1fr !important; }
    .adj-form-row   { flex-direction: column !important; }
    .adj-divider-v  { display: none !important; }
    .adj-header-meta { flex-direction: column !important; align-items: flex-start !important; }
  }
`;

const MACRO_META = {
  carbs:   { label: "Carbs",   color: "#6366f1" },
  protein: { label: "Protein", color: "#10b981" },
  fat:     { label: "Fat",     color: "#f59e0b" },
};

function gramsToMacroPercentages(T, proteinG, carbsG, fatG) {
  const Tn = Number(T) || 0;
  const pk = (Number(proteinG) || 0) * 4;
  const ck = (Number(carbsG) || 0) * 4;
  const fk = (Number(fatG) || 0) * 9;
  const sum = pk + ck + fk;
  if (!Tn || sum <= 0) {
    return { carbs: 40, protein: 30, fat: 30 };
  }
  let carbs = Math.round((ck / sum) * 100);
  let protein = Math.round((pk / sum) * 100);
  let fat = Math.round((fk / sum) * 100);
  const drift = 100 - (carbs + protein + fat);
  fat += drift;
  return { carbs, protein, fat };
}

function macroPercentsToGrams(T, macros) {
  const kcal = Number(T) || 0;
  return {
    protein_target_g: (kcal * (macros.protein / 100)) / 4,
    carbs_target_g: (kcal * (macros.carbs / 100)) / 4,
    fat_target_g: (kcal * (macros.fat / 100)) / 9,
  };
}

/** Build last-7-day weekday series from food log meals (total_calories per local day). */
function buildRecentPerfFromLogs(meals) {
  if (!Array.isArray(meals) || meals.length === 0) {
    return { chart: [], avgIntake: 0 };
  }
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const byDate = {};
  for (const m of meals) {
    const raw = m.consumed_at || m.logged_at;
    if (!raw) continue;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) continue;
    const key = d.toISOString().slice(0, 10);
    const kcal = Number(m.total_calories) || 0;
    byDate[key] = (byDate[key] || 0) + kcal;
  }
  const keys = Object.keys(byDate).sort();
  const last7 = keys.slice(-7);
  const chart = last7.map((dateStr) => {
    const d = new Date(`${dateStr}T12:00:00`);
    return {
      day: dayLabels[d.getDay()],
      kcal: Math.round(byDate[dateStr]),
    };
  });
  const sum = last7.reduce((acc, k) => acc + (byDate[k] || 0), 0);
  const avgIntake = last7.length ? Math.round(sum / last7.length) : 0;
  return { chart, avgIntake };
}

function PerfRecharts({ data, target }) {
  const safe = Array.isArray(data) && data.length > 0 ? data : [{ day: "—", kcal: 0 }];
  const chartData = safe.map((d) => ({ ...d, over: d.kcal > target }));
  const maxK = Math.max(...chartData.map((d) => d.kcal), target, 1);
  const yMax = Math.ceil(maxK / 200) * 200 + 200;

  return (
    <div style={{ flex: 1, minWidth: 0, height: 140 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <YAxis domain={[0, yMax]} tick={{ fontSize: 10, fill: "#9ca3af" }} width={36} />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v) => [`${v} kcal`, "Intake"]}
          />
          <ReferenceLine y={target} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1.5} />
          <Bar dataKey="kcal" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.over ? "#f87171" : "#34d399"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Adjustments() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientIdParam = searchParams.get("patient");
  const patientId = patientIdParam ? parseInt(patientIdParam, 10) : NaN;

  const [loadState, setLoadState] = useState({ loading: true, error: "" });
  const [patient, setPatient] = useState(null);
  const [plan, setPlan] = useState(null);
  const [recentPerf, setRecentPerf] = useState([]);
  const [avgIntake, setAvgIntake] = useState(0);

  const [newKcal, setNewKcal] = useState(2000);
  const [macros, setMacros] = useState({ carbs: 40, protein: 30, fat: 30 });
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!patientIdParam || Number.isNaN(patientId)) {
        setLoadState({ loading: false, error: "" });
        setPatient(null);
        setPlan(null);
        setRecentPerf([]);
        setAvgIntake(0);
        return;
      }

      setLoadState({ loading: true, error: "" });
      try {
        const [patients, activePlan, foodLogs] = await Promise.all([
          patientsApi.getManagedPatients(),
          patientsApi.getActiveDietPlan(patientId).catch(() => null),
          patientsApi.getFoodLogs(patientId, { days: 7 }).catch(() => []),
        ]);
        if (cancelled) return;

        const list = Array.isArray(patients) ? patients : patients?.results || [];
        const pRow = list.find((row) => Number(row.id) === patientId) || null;
        setPatient(pRow);

        if (!activePlan || !activePlan.id) {
          setPlan(null);
          setNewKcal(2000);
          setMacros({ carbs: 40, protein: 30, fat: 30 });
        } else {
          setPlan(activePlan);
          const T = Number(activePlan.daily_calorie_target) || Number(pRow?.daily_calorie_goal) || 2000;
          setNewKcal(T);
          setMacros(
            gramsToMacroPercentages(
              T,
              activePlan.protein_target_g,
              activePlan.carbs_target_g,
              activePlan.fat_target_g
            )
          );
        }

        const logs = Array.isArray(foodLogs) ? foodLogs : foodLogs?.results || [];
        const { chart, avgIntake: avg } = buildRecentPerfFromLogs(logs);
        setRecentPerf(chart);
        setAvgIntake(avg);
      } catch (e) {
        if (!cancelled) {
          setLoadState({ loading: false, error: e?.message || "Could not load patient data." });
        }
        return;
      }
      if (!cancelled) setLoadState({ loading: false, error: "" });
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [patientId, patientIdParam]);

  const macroSum = macros.carbs + macros.protein + macros.fat;
  const macroOk = macroSum === 100;
  const currentKcal = plan
    ? Number(plan.daily_calorie_target) || 0
    : Number(patient?.daily_calorie_goal) || 0;
  const delta = newKcal - currentKcal;

  const planDayLabel = useMemo(() => {
    const n = Array.isArray(plan?.meals_data) ? plan.meals_data.length : 0;
    if (!n) return null;
    return { current: Math.min(n, 7), total: n };
  }, [plan]);

  const setMacro = (k) => (e) => {
    setMacros((m) => ({ ...m, [k]: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }));
    setSaved(false);
  };

  const handleSave = useCallback(async () => {
    if (!macroOk || !plan?.id || !patientIdParam || Number.isNaN(patientId)) return;
    setSaving(true);
    setSaveErr("");
    setSaved(false);
    try {
      const grams = macroPercentsToGrams(newKcal, macros);
      const payload = {
        daily_calorie_target: Math.round(Number(newKcal) || 0),
        ...grams,
      };
      const updated = await patientsApi.updatePatientDietPlan(patientId, plan.id, payload);
      setPlan(updated);
      setMacros(
        gramsToMacroPercentages(
          updated.daily_calorie_target,
          updated.protein_target_g,
          updated.carbs_target_g,
          updated.fat_target_g
        )
      );
      setNewKcal(Number(updated.daily_calorie_target) || newKcal);
      if (reason.trim()) {
        try {
          await patientsApi.sendFeedback(patientId, "Plan adjustment", reason.trim());
        } catch {
          /* optional: feedback failure should not roll back plan save */
        }
      }
      setReason("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2400);
    } catch (err) {
      setSaveErr(err?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }, [macroOk, plan, patientId, patientIdParam, newKcal, macros, reason]);

  if (!patientIdParam || Number.isNaN(patientId)) {
    return (
      <div className="adj" style={{ padding: 24, maxWidth: 560 }}>
        <style>{STYLES}</style>
        <button className="adj-btn-ghost" onClick={() => navigate("/nutritionist/clients")} type="button">
          <ArrowLeft size={12} /> Clients
        </button>
        <p style={{ marginTop: 20, fontSize: 15, color: "#374151", lineHeight: 1.6 }}>
          Open <strong>Adjust Plan</strong> from a patient card in Clients so this page knows which patient to load.
        </p>
      </div>
    );
  }

  if (loadState.loading) {
    return (
      <div className="adj" style={{ padding: 40, display: "flex", alignItems: "center", gap: 10, color: "#6b7280" }}>
        <style>{STYLES}</style>
        <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
        Loading patient plan…
      </div>
    );
  }

  if (loadState.error) {
    return (
      <div className="adj" style={{ padding: 24, maxWidth: 560 }}>
        <style>{STYLES}</style>
        <button className="adj-btn-ghost" onClick={() => navigate("/nutritionist/clients")} type="button">
          <ArrowLeft size={12} /> Clients
        </button>
        <p style={{ marginTop: 16, color: "#b91c1c", fontSize: 14 }}>{loadState.error}</p>
      </div>
    );
  }

  const pName = patient?.full_name || "Patient";
  const pGoal = patient?.goal || "—";
  const chartTarget = currentKcal || newKcal;

  if (!plan?.id) {
    return (
      <div className="adj" style={{ padding: 24, maxWidth: 560 }}>
        <style>{STYLES}</style>
        <div style={{ marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
          <button className="adj-btn-ghost" onClick={() => navigate("/nutritionist/clients")} type="button">
            <ArrowLeft size={12} /> Clients
          </button>
          <span style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>{pName}</span>
        </div>
        <p style={{ fontSize: 15, color: "#4b5563", lineHeight: 1.6 }}>
          This patient does not have an active diet plan yet. Assign a plan first, then return here to adjust targets.
        </p>
        <button className="adj-btn-primary" type="button" style={{ marginTop: 16, background: "var(--green, #4e9a78)", color: "#fff" }} onClick={() => navigate("/nutritionist/create-plan")}>
          Assign plan
        </button>
      </div>
    );
  }

  return (
    <div className="adj">
      <style>{STYLES}</style>

      <div style={{ marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
        <button
          className="adj-btn-ghost"
          onClick={() => navigate("/nutritionist/clients")}
          type="button"
          style={{ height: 30, padding: "0 10px", fontSize: 12 }}
        >
          <ArrowLeft size={12} /> Clients
        </button>

        <div className="adj-header-meta" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>{pName}</span>
          <span style={{ color: "#e5e7eb" }}>·</span>
          <span style={{ fontSize: 13, color: "#6b7280" }}>Goal: {pGoal}</span>
          {planDayLabel && (
            <>
              <span style={{ color: "#e5e7eb" }}>·</span>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0",
              }}>
                Plan length: {planDayLabel.total} day{planDayLabel.total === 1 ? "" : "s"}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="adj-stats-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div style={{
          background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 12,
          padding: "22px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            fontSize: 11, fontWeight: 600, color: "#9ca3af",
            textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 14,
          }}>
            Current Plan
          </span>
          <div style={{ fontSize: 48, fontWeight: 900, color: "#111827", lineHeight: 1, marginBottom: 2 }}>
            {currentKcal ? currentKcal.toLocaleString() : "—"}
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500, marginBottom: 18 }}>kcal / day</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            {Object.entries(
              gramsToMacroPercentages(
                currentKcal,
                plan.protein_target_g,
                plan.carbs_target_g,
                plan.fat_target_g
              )
            ).map(([k, v]) => (
              <div key={k} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "5px 11px", borderRadius: 20,
                background: "#f9fafb", border: "1px solid #e5e7eb",
              }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: MACRO_META[k].color }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{v}%</span>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>{MACRO_META[k].label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".5px" }}>
              Logged intake (7 days)
            </span>
            {avgIntake > chartTarget && chartTarget > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 3,
                fontSize: 10, fontWeight: 600,
                color: "#991b1b", background: "#fef2f2",
                border: "1px solid #fecaca", borderRadius: 99, padding: "2px 7px",
              }}>
                <AlertTriangle size={9} /> Above target
              </div>
            )}
          </div>
          {recentPerf.length === 0 ? (
            <p style={{ fontSize: 13, color: "#9ca3af", margin: "24px 0" }}>No meal logs in the last 7 days.</p>
          ) : (
            <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
              <PerfRecharts data={recentPerf} target={chartTarget} />
              <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px" }}>7-day avg</div>
                <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1, color: avgIntake > chartTarget && chartTarget > 0 ? "#dc2626" : "#065f46" }}>
                  {avgIntake.toLocaleString()}
                </div>
                <div style={{ fontSize: 10, color: "#9ca3af" }}>kcal / day</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
        <div style={{
          padding: "12px 20px",
          borderBottom: "1px solid #f3f4f6",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: "#111827" }}>New Adjustment Targets</span>
          {delta !== 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99,
              background: delta < 0 ? "#ecfdf5" : "#fef2f2",
              color: delta < 0 ? "#065f46" : "#991b1b",
              border: `1px solid ${delta < 0 ? "#a7f3d0" : "#fecaca"}`,
            }}>
              {delta < 0 ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
              {Math.abs(delta)} kcal {delta < 0 ? "reduction" : "increase"}
            </div>
          )}
        </div>

        <div style={{ padding: "20px" }}>
          <div className="adj-form-row" style={{ display: "flex", gap: 28, flexWrap: "wrap", marginBottom: 16, alignItems: "flex-start" }}>
            <div style={{ flexShrink: 0 }}>
              <label className="adj-label">New Daily Calories</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  className="adj-num"
                  type="number"
                  min={800}
                  max={5000}
                  value={newKcal}
                  onChange={(e) => {
                    setNewKcal(Number(e.target.value));
                    setSaved(false);
                  }}
                />
                <span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>kcal</span>
              </div>
            </div>

            <div className="adj-divider-v" style={{ width: 1, background: "#f3f4f6", alignSelf: "stretch", marginTop: 22 }} />

            <div style={{ flex: 1, minWidth: 200 }}>
              <label className="adj-label">Macronutrient Split (%)</label>
              <div style={{ display: "flex", gap: 10 }}>
                {Object.entries(MACRO_META).map(([k, { label, color }]) => (
                  <div key={k} style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color, marginBottom: 5 }}>{label}</div>
                    <input
                      className="adj-macro"
                      type="number"
                      min={0}
                      max={100}
                      value={macros[k]}
                      onChange={setMacro(k)}
                    />
                  </div>
                ))}
              </div>
              <div style={{
                marginTop: 8, fontSize: 11, fontWeight: 600,
                color: macroOk ? "#059669" : "#dc2626",
                display: "flex", alignItems: "center", gap: 4,
              }}>
                {macroOk
                  ? <><CheckCircle size={11} /> Macros sum to 100%</>
                  : <><AlertTriangle size={11} /> {macroSum}% — must equal 100%</>}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ height: 5, borderRadius: 99, overflow: "hidden", display: "flex", background: "#f3f4f6" }}>
              {Object.entries(MACRO_META).map(([k, { color }]) => (
                <div key={k} className="macro-seg" style={{ width: `${macros[k]}%`, background: color }} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
              {Object.entries(MACRO_META).map(([k, { label, color }]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
                  <span style={{ fontSize: 11, color: "#6b7280" }}>{macros[k]}% {label}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ height: 1, background: "#f3f4f6", marginBottom: 16 }} />

          <div style={{ marginBottom: 14 }}>
            <label className="adj-label">Reason for Adjustment</label>
            <textarea
              className="adj-textarea"
              placeholder="Optional — saved as feedback to the patient when provided."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setSaved(false);
              }}
            />
          </div>

          <div style={{
            display: "flex", alignItems: "flex-start", gap: 8,
            padding: "9px 12px", borderRadius: 8,
            background: "#fffbeb", border: "1px solid #fde68a",
            marginBottom: 16,
          }}>
            <AlertTriangle size={13} color="#d97706" style={{ marginTop: 1, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "#92400e", lineHeight: 1.55 }}>
              Existing meal plans may not match the updated calorie target. Per-meal slots can be edited from the patient&apos;s meal plan view.
            </span>
          </div>

          {saveErr && (
            <div style={{
              display: "flex", alignItems: "center", gap: 7, marginBottom: 14,
              padding: "9px 12px", borderRadius: 8,
              background: "#fef2f2", border: "1px solid #fecaca",
              color: "#991b1b", fontSize: 12, fontWeight: 500,
            }}>
              <AlertTriangle size={13} /> {saveErr}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              className="adj-btn-primary"
              onClick={handleSave}
              disabled={saving || !macroOk}
              style={{
                background: saved ? "#065f46" : !macroOk ? "#e5e7eb" : "var(--green, #4e9a78)",
                color: !macroOk ? "#9ca3af" : "#fff",
              }}
            >
              {saving
                ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving…</>
                : saved
                ? <><CheckCircle size={14} /> Saved!</>
                : <><Save size={14} /> Save Adjustment</>}
            </button>
            <button type="button" className="adj-btn-ghost" onClick={() => navigate("/nutritionist/clients")}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
