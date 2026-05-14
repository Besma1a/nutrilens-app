import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { patientsApi } from "../../services/api";

const card = {
  background: "white",
  border: "1px solid var(--border)",
  borderRadius: "var(--r-lg)",
  padding: "24px",
  boxShadow: "var(--shadow-sm)"
};

const inputStyle = {
  height: 42,
  border: "1px solid var(--border)",
  borderRadius: "var(--r-md)",
  padding: "0 16px",
  fontSize: 13.5,
  fontFamily: "inherit",
  color: "var(--gray-700)",
  background: "white",
  outline: "none",
  width: "100%",
  transition: "var(--ease)"
};

export default function AssignPlan() {
  const navigate = useNavigate();
  const location = useLocation();
  const successRef = useRef(null);
  const [pendingPlanData, setPendingPlanData] = useState(null);

  const [formData, setFormData] = useState({
    patient: "",
    startDate: "2026-04-06",
    endDate: "2026-05-06",
    notes: "Focus on reducing refined carbs and increasing fiber intake.",
    followUp: "Weekly check-in"
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assigned, setAssigned] = useState(false);
  const [error, setError] = useState("");
  const [patients, setPatients] = useState([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);

  // Focus management for success screen
  useEffect(() => {
    if (assigned && successRef.current) {
      successRef.current.focus();
    }
  }, [assigned]);

  useEffect(() => {
    const navigationState = location.state;
    if (navigationState?.plan && navigationState?.dailyPlan) {
      setPendingPlanData(navigationState);
      return;
    }

    try {
      const fromStorage = sessionStorage.getItem("pendingDietPlanAssignment");
      if (!fromStorage) return;
      const parsed = JSON.parse(fromStorage);
      if (parsed?.plan && parsed?.dailyPlan) {
        setPendingPlanData(parsed);
      }
    } catch (err) {
      console.error("Failed to parse pending plan data:", err);
    }
  }, [location.state]);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setIsLoadingPatients(true);
        const data = await patientsApi.getManagedPatients();
        setPatients(Array.isArray(data) ? data : []);
        console.log("AssignPlan patients:", data);
      } catch (err) {
        console.error("Failed to fetch patients:", err);
        setError("Failed to load patients list.");
        setPatients([]);
      } finally {
        setIsLoadingPatients(false);
      }
    };
    fetchPatients();
  }, []);

  const selectedPatientName =
    patients.find((p) => String(p.id) === String(formData.patient))?.full_name ||
    "The patient";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const handleAssign = async () => {
    if (!formData.patient) {
      setError("Please select a patient.");
      return;
    }
    if (!pendingPlanData?.plan || !pendingPlanData?.dailyPlan) {
      setError("No plan data found. Please finalize a plan first.");
      return;
    }

    const { plan, dailyPlan } = pendingPlanData;
    const confirmed = window.confirm(
      `Assign "${plan.name}" to ${selectedPatientName}?\n\nThis action cannot be undone and the patient will be notified immediately.`
    );

    if (!confirmed) return;

    setIsSubmitting(true);
    setError("");

    try {
      const kcal = Number(plan.targetKcal) || 0;
      const proteinPct = Number(plan.protein) || 0;
      const carbsPct = Number(plan.carbs) || 0;
      const fatPct = Number(plan.fat) || 0;
      await patientsApi.assignDietPlan(formData.patient, {
        title: plan.name,
        plan_type: "custom",
        daily_calorie_target: kcal,
        protein_target_g: (proteinPct * kcal) / 400,
        carbs_target_g: (carbsPct * kcal) / 400,
        fat_target_g: (fatPct * kcal) / 900,
        meals_data: dailyPlan,
        description: plan.notes || formData.notes,
      });
      sessionStorage.removeItem("pendingDietPlanAssignment");
      setAssigned(true);
    } catch (err) {
      setError(err?.message || "Failed to assign plan. Please check your connection and try again.");
      console.error("Assign plan error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success Screen
  if (assigned) {
    return (
      <div 
        ref={successRef}
        tabIndex={-1}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "420px",
          gap: 16,
          textAlign: "center"
        }}
      >
        <CheckCircle size={64} color="var(--green)" strokeWidth={1.5} />
        <div style={{ fontSize: 22, fontWeight: 700, color: "var(--gray-800)" }}>
          Plan Assigned Successfully!
        </div>
        <div style={{ fontSize: 14, color: "var(--gray-500)", maxWidth: 320 }}>
          {selectedPatientName} has been notified via email and push notification.
        </div>

        <div style={{ width: 240, height: 5, background: "var(--gray-100)", borderRadius: 999, overflow: "hidden", marginTop: 12 }}>
          <div 
            style={{
              height: "100%",
              background: "var(--green)",
              borderRadius: 999,
              animation: "fillBar 2.2s linear forwards"
            }} 
          />
        </div>

        <style>{`
          @keyframes fillBar {
            from { width: 0%; }
            to { width: 100%; }
          }
        `}</style>

        <button
          onClick={() => navigate("/nutritionist/calendar")}
          style={{
            marginTop: 24,
            padding: "11px 28px",
            background: "var(--gray-800)",
            color: "white",
            border: "none",
            borderRadius: "var(--r-md)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          Go to Calendar
        </button>
      </div>
    );
  }

  return (
    <>
      <div style={card}>
        {error && (
          <div style={{
            background: "var(--red-light)",
            color: "var(--red)",
            padding: "12px 16px",
            borderRadius: "var(--r-md)",
            fontSize: 13,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 8
          }}>
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {/* Patient */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--gray-600)", marginBottom: 7, display: "block" }}>
            Select Patient <span style={{ color: "var(--red)" }}>*</span>
          </label>
          <select
            name="patient"
            value={formData.patient}
            onChange={handleChange}
            disabled={isLoadingPatients}
            style={{
              ...inputStyle,
              cursor: "pointer",
              borderColor: formData.patient ? "var(--green)" : "var(--border)"
            }}
          >
            <option value="">{isLoadingPatients ? "Loading patients..." : "Choose a patient…"}</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>
                {p.full_name} (#{p.id})
              </option>
            ))}
          </select>
        </div>

        {/* Plan (readonly preview from Create Plan) */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--gray-600)", marginBottom: 7, display: "block" }}>
            Plan to Assign <span style={{ color: "var(--red)" }}>*</span>
          </label>
          <input
            readOnly
            value={pendingPlanData?.plan?.name || "No finalized plan selected"}
            style={{
              ...inputStyle,
              background: "var(--gray-50)",
              borderColor: pendingPlanData?.plan?.name ? "var(--green)" : "var(--border)"
            }}
          />
        </div>

        {/* Dates - Full width grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
          <div>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--gray-600)", marginBottom: 7, display: "block" }}>
              Start Date
            </label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--gray-600)", marginBottom: 7, display: "block" }}>
              End Date
            </label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--gray-600)", marginBottom: 7, display: "block" }}>
            Personal Notes for Patient
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            style={{
              ...inputStyle,
              height: "auto",
              minHeight: 100,
              padding: "12px 16px",
              resize: "vertical",
              lineHeight: 1.55
            }}
          />
        </div>

        {/* Follow-up */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--gray-600)", marginBottom: 7, display: "block" }}>
            Follow-up Schedule
          </label>
          <select
            name="followUp"
            value={formData.followUp}
            onChange={handleChange}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            <option>Weekly check-in</option>
            <option>Bi-weekly review</option>
            <option>Monthly consultation</option>
            <option>No scheduled follow-up</option>
          </select>
        </div>

        {/* Notification Banner */}
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          padding: "14px 16px",
          background: "var(--green-light)",
          border: "1px solid var(--green-mid)",
          borderRadius: "var(--r-md)",
          marginBottom: 28
        }}>
          <CheckCircle size={20} color="var(--green-dark)" style={{ marginTop: 1 }} />
          <p style={{ fontSize: 13, color: "var(--green-dark)", margin: 0, lineHeight: 1.5 }}>
            The patient will be notified automatically via push notification and email once the plan is assigned.
          </p>
        </div>

        {/* Assign Button - Full Width */}
        <button
          onClick={handleAssign}
          disabled={isSubmitting || !formData.patient || !pendingPlanData?.plan || !pendingPlanData?.dailyPlan}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: "var(--r-md)",
            background: (formData.patient && pendingPlanData?.plan && pendingPlanData?.dailyPlan) ? "var(--green)" : "var(--gray-200)",
            color: (formData.patient && pendingPlanData?.plan && pendingPlanData?.dailyPlan) ? "white" : "var(--gray-400)",
            border: "none",
            fontSize: 14.5,
            fontWeight: 600,
            cursor: (formData.patient && pendingPlanData?.plan && pendingPlanData?.dailyPlan && !isSubmitting) ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 9,
            transition: "var(--ease)"
          }}
        >
          {isSubmitting ? "Assigning Plan..." : "Assign Plan to Patient"}
          {!isSubmitting && <CheckCircle size={18} />}
        </button>
      </div>


    </>
  );
}