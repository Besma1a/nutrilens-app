import { useState } from "react";
import { dietPlanTemplatesApi } from "../../services/api";
import { Save, AlertCircle, FileText, Image as ImageIcon } from "lucide-react";

/* ── helpers ──────────────────────────────────────────────── */

function emptyTemplate() {
  return {
    title: "",
    description: "",
    overview: "",
    plan_type: "standard",
    category: "Lifestyle & Occasions",
    meals_data: {},
    key_guidelines: [],
    example_meals: [],
    image: null,
  };
}

/* ── inline styles ────────────────────────────────────────── */

const card = {
  background: 'white',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-lg)',
  boxShadow: 'var(--shadow-sm)',
  padding: 32,
};

const lbl = {
  fontSize: 12,
  fontWeight: 700,
  color: "var(--gray-600)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 8,
  display: "block",
};

const inp = {
  width: "100%",
  padding: "12px",
  borderRadius: "var(--r-md)",
  border: "1px solid var(--border)",
  fontSize: 14,
  color: "var(--gray-800)",
  outline: "none",
  background: "#fcfcfc",
  fontFamily: "inherit",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

const textArea = {
  ...inp,
  resize: "vertical",
  minHeight: 100,
};

/* ══════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                                 */
/* ══════════════════════════════════════════════════════════ */

export default function DietPlans() {
  const [draft, setDraft] = useState(() => emptyTemplate());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const setField = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  const onSave = async () => {
    if (!draft.title.trim()) {
      setError("Please enter a plan title.");
      return;
    }
    if (!draft.overview.trim()) {
      setError("Please enter an overview for your diet plan.");
      return;
    }
    
    setBusy(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("title", draft.title.trim());
      formData.append("description", draft.description.trim());
      formData.append("overview", draft.overview.trim());
      formData.append("plan_type", draft.plan_type);
      formData.append("category", draft.category);
      
      // JSON fields
      formData.append("meals_data", JSON.stringify(draft.meals_data ?? {}));
      formData.append("key_guidelines", JSON.stringify(Array.isArray(draft.key_guidelines) ? draft.key_guidelines : []));
      formData.append("example_meals", JSON.stringify(Array.isArray(draft.example_meals) ? draft.example_meals : []));
      
      if (draft.image) {
        formData.append("image", draft.image);
      }
      
      await dietPlanTemplatesApi.create(formData);
      
      setNotice("✓ Plan submitted successfully. It will appear publicly after admin approval.");
      setDraft(emptyTemplate());
      
      setTimeout(() => setNotice(""), 4000);
    } catch (e) {
      setError(e?.message || "Failed to save plan. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 840, margin: "0 auto", paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--gray-900)", letterSpacing: "-0.6px", margin: 0 }}>
          Create Diet Plan
        </h1>
        <p style={{ marginTop: 8, fontSize: 16, color: "var(--gray-500)" }}>
          Design a new meal plan template for your clients and the public catalog.
        </p>
      </div>

      {/* Alerts */}
      {notice && (
        <div style={{
          background: "#ecfdf5", border: "1px solid #bbf7d0", borderRadius: 12,
          padding: "16px", color: "#065f46", fontSize: 14, fontWeight: 600,
          marginBottom: 24, display: "flex", alignItems: "center", gap: 10,
        }}>
          <span>✓</span> {notice}
        </div>
      )}

      {error && (
        <div style={{
          background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12,
          padding: "16px", color: "#991b1b", fontSize: 14, fontWeight: 600,
          marginBottom: 24, display: "flex", alignItems: "center", gap: 10,
        }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div style={card}>
        {/* Basic Info */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
          <div>
            <label style={lbl}>Plan Title *</label>
            <input 
              style={inp} 
              value={draft.title} 
              onChange={e => setField("title", e.target.value)} 
              placeholder="e.g. Keto Weight Loss" 
            />
          </div>
          <div>
            <label style={lbl}>Plan Type</label>
            <select 
              style={{ ...inp, cursor: "pointer" }} 
              value={draft.plan_type} 
              onChange={e => setField("plan_type", e.target.value)}
            >
              <option value="standard">Standard</option>
              <option value="seasonal">Seasonal</option>
              <option value="medical">Medical</option>
              <option value="ramadan">Ramadan</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={lbl}>Category *</label>
          <select 
            style={{ ...inp, cursor: "pointer" }} 
            value={draft.category} 
            onChange={e => setField("category", e.target.value)}
          >
            <option value="Lifestyle & Occasions">Lifestyle & Occasions</option>
            <option value="For Health Conditions">For Health Conditions</option>
          </select>
        </div>

        {/* Featured Image Upload */}
        <div style={{ marginBottom: 24 }}>
          <label style={lbl}>Featured Image</label>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-md)",
            background: "#fcfcfc",
          }}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setField("image", e.target.files[0])}
              style={{ fontSize: 13 }}
            />
            {draft.image && (
              <span style={{ fontSize: 12, color: "var(--green)", fontWeight: 600 }}>
                File selected
              </span>
            )}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={lbl}>Short Summary</label>
          <textarea 
            style={{ ...textArea, minHeight: 70 }} 
            value={draft.description} 
            onChange={e => setField("description", e.target.value)} 
            placeholder="A brief 1-2 sentence hook…" 
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={lbl}>Detailed Overview *</label>
          <textarea 
            style={{ ...textArea, minHeight: 180 }} 
            value={draft.overview} 
            onChange={e => setField("overview", e.target.value)} 
            placeholder="Explain the plan's philosophy, focus, and methodology…" 
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
          <div>
            <label style={lbl}>Key Guidelines (One per line)</label>
            <textarea 
              style={{ ...textArea, minHeight: 150 }} 
              value={draft.key_guidelines.join("\n")} 
              onChange={(e) => setField("key_guidelines", e.target.value.split("\n").filter(Boolean))} 
              placeholder="e.g. Drink 2L of water daily" 
            />
          </div>
          <div>
            <label style={lbl}>Example Meals (One per line)</label>
            <textarea 
              style={{ ...textArea, minHeight: 150 }} 
              value={draft.example_meals.join("\n")} 
              onChange={(e) => setField("example_meals", e.target.value.split("\n").filter(Boolean))} 
              placeholder="e.g. Grilled Salmon with Asparagus" 
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button 
            type="button" 
            onClick={onSave} 
            disabled={busy} 
            style={{ 
              display: "inline-flex", 
              alignItems: "center", 
              gap: 10, 
              padding: "14px 36px", 
              borderRadius: "var(--r-md)", 
              border: "none", 
              background: "var(--green)", 
              fontSize: 15, 
              fontWeight: 800, 
              cursor: "pointer", 
              color: "white",
              boxShadow: "0 4px 12px rgba(43,87,38,0.25)",
              transition: "all 0.2s",
            }}
          >
            <Save size={18} /> {busy ? "Submitting..." : "Publish Diet Plan"}
          </button>
        </div>
      </div>
    </div>
  );
}
