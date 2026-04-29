import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { TrendingUp, Save, Users, Loader, MessageSquare, Send } from "lucide-react";
import { patientsApi } from "../../services/api";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";

// ─── responsive hook ──────────────────────────────────────────────────────────

function useWindowWidth() {
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
}

// ─── shared styles ────────────────────────────────────────────────────────────

const card = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "18px 20px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
};

const tooltipStyle = {
  backgroundColor: "white",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  fontSize: 12,
};

// ─── HELPER: Aggregate meals by date ──────────────────────────────────────────

/**
 * FIX #1: Aggregate raw Meal[] by date into daily calorie totals.
 *
 * Input: [
 *   { id: 1, logged_at: "2025-04-23T12:30:00Z", meal_type: "Lunch", total_calories: 450, ... },
 *   { id: 2, logged_at: "2025-04-23T18:45:00Z", meal_type: "Dinner", total_calories: 620, ... },
 * ]
 *
 * Output (sorted oldest first for chart): [
 *   { date: "Apr 22", label: "Tue", calories: 380, over: false },
 *   { date: "Apr 23", label: "Wed", calories: 1070, over: false },
 * ]
 */
function aggregateMealsByDate(meals, target = 1800) {
  const byDate = {};

  (meals || []).forEach((meal) => {
    if (!meal.logged_at) return;

    const mealDate = new Date(meal.logged_at);
    const dateKey = mealDate.toISOString().split("T")[0]; // "YYYY-MM-DD"

    if (!byDate[dateKey]) {
      byDate[dateKey] = {
        date: dateKey,
        label: mealDate.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
      };
    }

    byDate[dateKey].calories += meal.total_calories || 0;
    byDate[dateKey].protein_g += meal.total_protein_g || 0;
    byDate[dateKey].carbs_g += meal.total_carbs_g || 0;
    byDate[dateKey].fat_g += meal.total_fat_g || 0;
  });

  // Convert to array and sort by date (oldest first for x-axis)
  return Object.values(byDate)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((d) => ({
      ...d,
      over: d.calories > target,
    }));
}

// ─── HELPER: Transform weight entries ──────────────────────────────────────────

function buildWeightChart(entries) {
  return [...(entries || [])]
    .reverse() // oldest → newest
    .slice(-12) // cap at 12 points
    .map((e) => ({
      date: e.date,
      weight: e.weight_kg,
      label: e.date
        ? new Date(`${e.date}T00:00:00`).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : "—",
    }));
}

// ─── HELPER: Build food log rows ───────────────────────────────────────────────

function buildFoodLog(meals) {
  const rows = [];
  (meals || []).forEach((meal) => {
    const time = meal.logged_at
      ? new Date(meal.logged_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

    if ((meal.food_items || []).length > 0) {
      meal.food_items.forEach((item, idx) => {
        rows.push({
          id: `${meal.id}-${idx}`,
          name: item.name,
          weight: item.quantity_g ? `${Math.round(item.quantity_g)}g` : "—",
          scanned: item.confidence != null ? "AI Scanned" : "Manual",
          protein: Math.round(item.protein_g || 0),
          carbs: Math.round(item.carbs_g || 0),
          fat: Math.round(item.fat_g || 0),
          kcal: Math.round(item.calories || 0),
          time,
          mealType: meal.meal_type,
        });
      });
    } else if (meal.total_calories > 0) {
      // Meal with no food_items breakdown
      rows.push({
        id: `${meal.id}-0`,
        name: `${meal.meal_type} — Manual entry`,
        weight: "—",
        scanned: "Manual",
        protein: Math.round(meal.total_protein_g || 0),
        carbs: Math.round(meal.total_carbs_g || 0),
        fat: Math.round(meal.total_fat_g || 0),
        kcal: Math.round(meal.total_calories || 0),
        time,
        mealType: meal.meal_type,
      });
    }
  });
  return rows;
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────

export default function Progress() {
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 640;
  const isDesktop = windowWidth >= 1024;

  // Read ?patient=<id> from URL (set when navigating from Clients.jsx)
  const [searchParams] = useSearchParams();
  const patientIdFromUrl = searchParams.get("patient");

  // ── state ──────────────────────────────────────────────────────────────────
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState("");

  const [weightData, setWeightData] = useState([]);
  const [calorieData, setCalorieData] = useState([]);
  const [foodLog, setFoodLog] = useState([]);
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [profile, setProfile] = useState(null);
  const [calTarget, setCalTarget] = useState(1800);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [noteTitle, setNoteTitle] = useState("");
  const [noteMessage, setNoteMessage] = useState("");
  const [sendingNote, setSendingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  // ── fetch patients from API ────────────────────────────────────────────────
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setPatientsLoading(true);
        const data = await patientsApi.getManagedPatients();
        const patientList = Array.isArray(data) ? data : [];
        setPatients(patientList);

        // Pre-select from URL param first, otherwise first patient in list
        if (patientIdFromUrl && patientList.some(p => String(p.id) === patientIdFromUrl)) {
          setSelectedPatient(patientIdFromUrl);
        } else if (patientList.length > 0) {
          setSelectedPatient(String(patientList[0].id));
        }
      } catch (err) {
        console.error("Failed to fetch patients:", err);
        setError("Could not load patients. Please try again.");
        setPatients([]);
      } finally {
        setPatientsLoading(false);
      }
    };

    fetchPatients();
  }, [patientIdFromUrl]);

  // ── fetch patient data ─────────────────────────────────────────────────────
  const fetchPatientData = useCallback(async (patientId) => {
    if (!patientId) return;
    setLoading(true);
    setError(null);

    try {
      const today = new Date().toISOString().split("T")[0];

      // Parallel requests
      const [weightEntries, calorieHistory, todayMeals, feedbackList] = await Promise.all([
        patientsApi.getWeightHistory(patientId, { limit: 12 }),
        patientsApi.getFoodLogs(patientId, { days: 14 }),
        patientsApi.getFoodLogs(patientId, { date: today }),
        patientsApi.getPatientFeedback(patientId),
      ]);

      // Build weight chart
      const wChart = buildWeightChart(weightEntries);
      setWeightData(wChart);

      // Aggregate meals by date for calorie chart (FIX #1)
      const cChart = aggregateMealsByDate(calorieHistory, calTarget);
      setCalorieData(cChart);

      // Build food diary
      setFoodLog(buildFoodLog(todayMeals));

      // Set feedback history (FIX #2)
      setFeedbackHistory(Array.isArray(feedbackList) ? feedbackList : feedbackList?.results || []);

      // Stat-card data
      if (weightEntries && weightEntries.length > 0) {
        const latest = weightEntries[0];
        const oldest = weightEntries[weightEntries.length - 1];
        setProfile({ latest, oldest });
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error("Failed to load patient progress:", err);
      setError(err.message || "Failed to load patient data.");
    } finally {
      setLoading(false);
    }
  }, [calTarget]);

  useEffect(() => {
    if (selectedPatient) {
      // Use the patient's real daily_calorie_goal from their profile
      const patient = patients.find(p => String(p.id) === String(selectedPatient));
      if (patient?.daily_calorie_goal) {
        setCalTarget(patient.daily_calorie_goal);
      }
      fetchPatientData(selectedPatient);
    }
  }, [selectedPatient, fetchPatientData]);

  // ── send feedback ──────────────────────────────────────────────────────────
  const handleSendFeedback = async () => {
    if (!selectedPatient || !noteTitle.trim() || !noteMessage.trim()) {
      setError("Please enter both title and message");
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      setSendingNote(true);
      await patientsApi.sendFeedback(selectedPatient, noteTitle, noteMessage);

      setNoteSaved(true);
      setNoteTitle("");
      setNoteMessage("");

      // Refresh feedback history
      await fetchPatientData(selectedPatient);

      setTimeout(() => setNoteSaved(false), 3000);
    } catch (err) {
      console.error("Failed to send feedback:", err);
      setError("Failed to send feedback. Please try again.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setSendingNote(false);
    }
  };

  // ── derived values ────────────────────────────────────────────────────────
  const currentWeight = profile?.latest?.weight_kg ?? null;
  const startWeight = profile?.oldest?.weight_kg ?? null;
  const weightChange =
    currentWeight != null && startWeight != null
      ? (currentWeight - startWeight).toFixed(1)
      : null;

  // Y-axis domain for weight chart
  const wValues = weightData.map((d) => d.weight);
  const wMin = wValues.length ? Math.min(...wValues) - 1 : 60;
  const wMax = wValues.length ? Math.max(...wValues) + 1 : 80;

  // Layout helpers
  const statGridCols = isMobile ? "1fr 1fr" : "repeat(3, 1fr)";
  const chartGridCols = isMobile ? "1fr" : "1fr 1fr";
  const logGridCols = isMobile ? "1fr" : isDesktop ? "2fr 1fr" : "1fr";

  // ─── render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "20px", background: "#f9fafb", minHeight: "100vh" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "800", margin: "0 0 12px 0", color: "#1f2937" }}>
            Patient Progress
          </h1>
          <p style={{ color: "#6b7280", margin: 0 }}>
            Monitor patient health metrics, food logs, and send feedback
          </p>
        </div>

        {/* Patient Selector */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
            {patientsLoading && <Loader size={16} style={{ animation: "spin .7s linear infinite" }} />}
            <label style={{ fontSize: "14px", fontWeight: "600", color: "#374151", whiteSpace: "nowrap" }}>
              Select Patient:
            </label>
            <select
              value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)}
              style={{
                height: "38px",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "0 12px",
                fontSize: "13px",
                fontFamily: "inherit",
                color: "#374151",
                outline: "none",
                cursor: "pointer",
                width: isMobile ? "100%" : "320px",
                background: "white",
                flex: 1,
              }}
            >
              <option value="">-- Select a patient --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name || `Patient #${p.id}`}
                </option>
              ))}
            </select>
          </div>
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#9ca3af", whiteSpace: "nowrap" }}>
              <Loader size={16} style={{ animation: "spin .7s linear infinite" }} />
              <span style={{ fontSize: "13px" }}>Loading...</span>
            </div>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              padding: "12px 14px",
              color: "#991b1b",
              fontSize: "13px",
              marginBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {error}
            <button
              onClick={() => setError(null)}
              style={{
                background: "none",
                border: "none",
                color: "#991b1b",
                cursor: "pointer",
                fontSize: "18px",
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Success Banner */}
        {noteSaved && (
          <div
            style={{
              background: "#ecfdf5",
              border: "1px solid #86efac",
              borderRadius: "8px",
              padding: "12px 14px",
              color: "#166534",
              fontSize: "13px",
              marginBottom: "16px",
            }}
          >
            ✓ Feedback sent successfully!
          </div>
        )}

        {/* Stat Cards */}
        {selectedPatient && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: statGridCols, gap: "12px", marginBottom: "20px" }}>
              {[
                {
                  color: "#059669",
                  icon: "📊",
                  label: "Current Weight",
                  value: currentWeight != null ? currentWeight.toFixed(1) : "—",
                  unit: " kg",
                  meta:
                    weightChange != null
                      ? `${weightChange > 0 ? "↑" : "↓"} ${Math.abs(weightChange)} kg`
                      : "No data",
                },
                {
                  color: "#2563eb",
                  icon: "📈",
                  label: "Weight Trend",
                  value: weightData.length,
                  unit: " entries",
                  meta: "Last 12 weeks",
                },
                {
                  color: "#d97706",
                  icon: "🍽️",
                  label: "Calorie Target",
                  value: calTarget.toLocaleString(),
                  unit: " kcal",
                  meta: `${foodLog.reduce((s, f) => s + f.kcal, 0)} consumed today`,
                },
              ].map((s, idx) => (
                <div
                  key={idx}
                  style={{
                    ...card,
                    borderTop: `3px solid ${s.color}`,
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      right: "16px",
                      top: "16px",
                      fontSize: "24px",
                    }}
                  >
                    {s.icon}
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: "500", color: "#9ca3af", marginBottom: "8px" }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: isMobile ? "20px" : "26px", fontWeight: "700", color: "#1f2937" }}>
                    {s.value}
                    <span style={{ fontSize: "14px", color: "#9ca3af" }}>{s.unit}</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "6px" }}>{s.meta}</div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div style={{ display: "grid", gridTemplateColumns: chartGridCols, gap: "12px", marginBottom: "20px" }}>
              {/* Weight Trend Chart */}
              <div style={card}>
                <h3 style={{ fontSize: "13px", fontWeight: "600", color: "#374151", margin: "0 0 12px 0" }}>
                  Weight Trend
                </h3>
                {weightData.length === 0 && !loading ? (
                  <div
                    style={{
                      height: "220px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#9ca3af",
                      fontSize: "13px",
                    }}
                  >
                    No weight data available
                  </div>
                ) : (
                  <div style={{ height: "220px", width: "100%", minWidth: 0 }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <LineChart data={weightData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                        <YAxis domain={[wMin, wMax]} tick={{ fontSize: 11, fill: "#9ca3af" }} width={36} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v.toFixed(1)} kg`, "Weight"]} />
                        <Line
                          type="monotone"
                          dataKey="weight"
                          stroke="#059669"
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: "#fff", strokeWidth: 2 }}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Calorie History Chart */}
              <div style={card}>
                <h3 style={{ fontSize: "13px", fontWeight: "600", color: "#374151", margin: "0 0 8px 0" }}>
                  Calorie History (14 days)
                </h3>
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    fontSize: "11px",
                    marginBottom: "12px",
                    flexWrap: "wrap",
                    color: "#6b7280",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#22c55e" }} />
                    Under target
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#ef4444" }} />
                    Over target
                  </span>
                </div>
                {calorieData.length === 0 && !loading ? (
                  <div
                    style={{
                      height: "200px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#9ca3af",
                      fontSize: "13px",
                    }}
                  >
                    No meal history available
                  </div>
                ) : (
                  <div style={{ height: "200px", width: "100%", minWidth: 0 }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <BarChart data={calorieData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="label" tick={{ fontSize: "10px", fill: "#9ca3af" }} />
                        <YAxis tick={{ fontSize: "11px", fill: "#9ca3af" }} width={32} />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          formatter={(v) => [`${Math.round(v)} kcal`, "Intake"]}
                        />
                        <ReferenceLine y={calTarget} stroke="#3b82f6" strokeDasharray="5 5" strokeWidth={1.5} />
                        <Bar dataKey="calories" radius={[4, 4, 0, 0]}>
                          {calorieData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.over ? "#ef4444" : "#22c55e"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Food Log + Notes Section */}
            <div style={{ display: "grid", gridTemplateColumns: logGridCols, gap: "12px" }}>
              {/* Today's Food Log */}
              <div style={card}>
                <h3 style={{ fontSize: "13px", fontWeight: "600", color: "#374151", margin: "0 0 12px 0" }}>
                  Today's Food Log
                </h3>
                {loading ? (
                  <div style={{ padding: "24px 0", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>
                    Loading…
                  </div>
                ) : foodLog.length === 0 ? (
                  <div
                    style={{
                      padding: "24px 0",
                      textAlign: "center",
                      color: "#9ca3af",
                      fontSize: "13px",
                      fontStyle: "italic",
                    }}
                  >
                    No meals logged today
                  </div>
                ) : (
                  <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                    {foodLog.map((f) => (
                      <div
                        key={f.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: isMobile ? "10px" : "16px",
                          padding: "14px 0",
                          borderBottom: "1px solid #f3f4f6",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: isMobile ? "13px" : "15px",
                              fontWeight: "600",
                              color: "#1f2937",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {f.name}
                          </div>
                          <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "3px" }}>
                            {f.weight} · {f.scanned} · {f.mealType}
                          </div>
                          <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "6px" }}>
                            P {f.protein}g · C {f.carbs}g · F {f.fat}g
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: isMobile ? "18px" : "24px", fontWeight: "700", color: "#1f2937" }}>
                            {f.kcal}
                          </div>
                          <div style={{ fontSize: "11px", color: "#9ca3af" }}>kcal</div>
                          <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>{f.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes and Feedback Section */}
              <div style={card}>
                <h3 style={{ fontSize: "13px", fontWeight: "600", color: "#374151", margin: "0 0 12px 0" }}>
                  Send Feedback
                </h3>

                {/* Note Title Input */}
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#6b7280", display: "block", marginBottom: "4px" }}>
                    Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Great progress this week!"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    style={{
                      width: "100%",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      padding: "8px 10px",
                      fontSize: "13px",
                      outline: "none",
                      boxSizing: "border-box",
                      fontFamily: "inherit",
                    }}
                  />
                </div>

                {/* Note Message Input */}
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#6b7280", display: "block", marginBottom: "4px" }}>
                    Message
                  </label>
                  <textarea
                    placeholder="Write your feedback here..."
                    value={noteMessage}
                    onChange={(e) => setNoteMessage(e.target.value)}
                    style={{
                      width: "100%",
                      minHeight: "100px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      padding: "10px",
                      fontSize: "13px",
                      outline: "none",
                      resize: "vertical",
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* Send Button */}
                <button
                  onClick={handleSendFeedback}
                  disabled={sendingNote}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "10px 16px",
                    borderRadius: "6px",
                    background: sendingNote ? "#d1d5db" : "#059669",
                    color: "white",
                    border: "none",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: sendingNote ? "not-allowed" : "pointer",
                    transition: "background 0.2s ease",
                  }}
                >
                  {sendingNote ? (
                    <>
                      <Loader size={14} style={{ animation: "spin .7s linear infinite" }} />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Send Feedback
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Feedback History Section (FIX #3) */}
            <div style={{ ...card, marginTop: "20px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#1f2937", margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                <MessageSquare size={18} style={{ color: "#059669" }} />
                Feedback History
              </h3>

              {feedbackHistory.length === 0 ? (
                <div
                  style={{
                    padding: "32px 0",
                    textAlign: "center",
                    color: "#9ca3af",
                    fontSize: "13px",
                    fontStyle: "italic",
                  }}
                >
                  No feedback sent to this patient yet
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {feedbackHistory.map((feedback) => {
                    const feedbackDate = new Date(feedback.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    return (
                      <div
                        key={feedback.id}
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          padding: "12px 14px",
                          background: "#f9fafb",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{ fontSize: "13px", fontWeight: "700", color: "#1f2937", margin: "0 0 4px 0" }}>
                              {feedback.title}
                            </h4>
                            <p style={{ fontSize: "13px", color: "#374151", margin: "0 0 8px 0", lineHeight: "1.5" }}>
                              {feedback.message}
                            </p>
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#9ca3af",
                                display: "flex",
                                gap: "12px",
                              }}
                            >
                              <span>{feedbackDate}</span>
                              {feedback.is_read ? (
                                <span style={{ color: "#059669", fontWeight: "600" }}>✓ Read</span>
                              ) : (
                                <span style={{ color: "#f97316", fontWeight: "600" }}>Unread</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {!selectedPatient && !patientsLoading && (
          <div
            style={{
              ...card,
              textAlign: "center",
              padding: "48px 20px",
              color: "#9ca3af",
            }}
          >
            <Users size={32} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
            <p style={{ fontSize: "14px", margin: 0 }}>
              Select a patient from the dropdown to view their progress
            </p>
          </div>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}