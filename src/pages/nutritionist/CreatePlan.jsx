import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Save, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";

/** Matches user MealPlan shape: meal `name` + ingredients with `name`, `qty` (portion), `kcal`. */
const emptyIngredient = () => ({ name: "", qty: "", kcal: 0 });

const mealSlot = (targetKcal = 400) => ({
  targetKcal,
  mealName: "",
  ingredients: [emptyIngredient()],
});

const MEAL_META = {
  breakfast: { label: "Breakfast" },
  lunch:     { label: "Lunch" },
  dinner:    { label: "Dinner" },
  snacks:    { label: "Snacks" },
};

const card = {
  background: "white",
  border: "1px solid var(--border)",
  borderRadius: "var(--r-lg)",
  padding: "18px 20px",
  boxShadow: "var(--shadow-sm)",
};

const label = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--gray-500)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 6,
  display: "block",
};

const input = {
  width: "100%",
  height: 42,
  padding: "0 12px",
  borderRadius: "var(--r-md)",
  border: "1px solid var(--border)",
  fontSize: 13,
  color: "var(--gray-800)",
  outline: "none",
  background: "white",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

function buildDailyPlan(totalDays) {
  return Array.from({ length: totalDays }, (_, i) => ({
    day: i + 1,
    meals: Object.keys(MEAL_META).reduce((acc, key) => {
      acc[key] = mealSlot(key === "dinner" ? 620 : key === "lunch" ? 580 : key === "breakfast" ? 420 : 200);
      return acc;
    }, {}),
  }));
}

function CreatePlanEditor({ totalDays, plan, setPlan, dailyPlan, setDailyPlan, navigate }) {
  const [currentDay, setCurrentDay] = useState(1);

  const updatePlanField = (f, v) => setPlan((p) => ({ ...p, [f]: v }));

  const patchCurrentDay = useCallback((fn) => {
    setDailyPlan((prev) => prev.map((day) => (day.day === currentDay ? fn(day) : day)));
  }, [currentDay]);

  const updateMealName = (mealKey, value) => {
    patchCurrentDay((day) => ({
      ...day,
      meals: {
        ...day.meals,
        [mealKey]: { ...day.meals[mealKey], mealName: value },
      },
    }));
  };

  const updateMealTargetKcal = (mealKey, value) => {
    patchCurrentDay((day) => ({
      ...day,
      meals: {
        ...day.meals,
        [mealKey]: { ...day.meals[mealKey], targetKcal: Number(value) || 0 },
      },
    }));
  };

  const updateIngredient = (mealKey, itemIdx, field, value) => {
    patchCurrentDay((day) => {
      const items = [...day.meals[mealKey].ingredients];
      items[itemIdx] = {
        ...items[itemIdx],
        [field]: field === "kcal" ? Number(value) || 0 : value,
      };
      return {
        ...day,
        meals: {
          ...day.meals,
          [mealKey]: { ...day.meals[mealKey], ingredients: items },
        },
      };
    });
  };

  const addIngredient = (mealKey) => {
    patchCurrentDay((day) => ({
      ...day,
      meals: {
        ...day.meals,
        [mealKey]: {
          ...day.meals[mealKey],
          ingredients: [...day.meals[mealKey].ingredients, emptyIngredient()],
        },
      },
    }));
  };

  const removeIngredient = (mealKey, itemIdx) => {
    patchCurrentDay((day) => {
      const ing = day.meals[mealKey].ingredients.filter((_, i) => i !== itemIdx);
      return {
        ...day,
        meals: {
          ...day.meals,
          [mealKey]: {
            ...day.meals[mealKey],
            ingredients: ing.length ? ing : [emptyIngredient()],
          },
        },
      };
    });
  };

  const currentDayData = dailyPlan.find((d) => d.day === currentDay);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <div style={{ ...card, marginBottom: 12 }}>
        <label style={label}>Plan name</label>
        <input style={input} value={plan.name} onChange={(e) => updatePlanField("name", e.target.value)} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginTop: 14 }}>
          <div>
            <label style={label}>Objective</label>
            <select style={{ ...input, cursor: "pointer" }} value={plan.goal} onChange={(e) => updatePlanField("goal", e.target.value)}>
              <option value="lose">Weight loss</option>
              <option value="maintain">Maintenance</option>
              <option value="gain">Muscle gain</option>
            </select>
          </div>
          <div>
            <label style={label}>Duration</label>
            <select style={{ ...input, cursor: "pointer" }} value={plan.duration} onChange={(e) => updatePlanField("duration", e.target.value)}>
              <option>1 Week</option>
              <option>4 Weeks</option>
              <option>6 Weeks</option>
              <option>8 Weeks</option>
            </select>
          </div>
          <div>
            <label style={label}>Daily kcal</label>
            <input type="number" style={input} value={plan.targetKcal} onChange={(e) => updatePlanField("targetKcal", Number(e.target.value))} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginTop: 14 }}>
          {["carbs", "protein", "fat"].map((m) => (
            <div key={m}>
              <label style={label}>{m} %</label>
              <input type="number" style={input} value={plan[m]} onChange={(e) => updatePlanField(m, Number(e.target.value))} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...card, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--gray-600)" }}>Day {currentDay} of {totalDays}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4, border: "1px solid var(--border)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
          <button
            type="button"
            onClick={() => setCurrentDay((d) => Math.max(1, d - 1))}
            style={{ padding: "8px 12px", background: "var(--gray-50)", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
            aria-label="Previous day"
          >
            <ChevronLeft size={18} color="var(--gray-600)" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentDay((d) => Math.min(totalDays, d + 1))}
            style={{ padding: "8px 12px", background: "var(--gray-50)", border: "none", borderLeft: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center" }}
            aria-label="Next day"
          >
            <ChevronRight size={18} color="var(--gray-600)" />
          </button>
        </div>
      </div>

      {Object.keys(MEAL_META).map((mealKey) => {
        const meal = currentDayData?.meals?.[mealKey];
        if (!meal) return null;
        return (
          <div key={mealKey} style={{ ...card, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "var(--gray-500)", textTransform: "uppercase" }}>
                {MEAL_META[mealKey].label}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "var(--gray-500)" }}>Meal target</span>
                <input
                  type="number"
                  style={{ ...input, width: 88, height: 36 }}
                  value={meal.targetKcal}
                  onChange={(e) => updateMealTargetKcal(mealKey, e.target.value)}
                />
                <span style={{ fontSize: 12, color: "var(--gray-400)" }}>kcal</span>
              </div>
            </div>

            <label style={label}>Meal name </label>
            <input
              style={{ ...input, marginBottom: 12 }}
              placeholder="e.g. Mediterranean Salmon & Quinoa"
              value={meal.mealName}
              onChange={(e) => updateMealName(mealKey, e.target.value)}
            />

            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--gray-500)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Ingredients & portions
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {meal.ingredients.map((ing, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 120px 88px auto",
                    gap: 8,
                    alignItems: "center",
                  }}
                  className="cp-ing-row"
                >
                  <input
                    style={input}
                    placeholder="Ingredient name"
                    value={ing.name}
                    onChange={(e) => updateIngredient(mealKey, idx, "name", e.target.value)}
                  />
                  <input
                    style={input}
                    placeholder="Portion (e.g. 200g)"
                    value={ing.qty}
                    onChange={(e) => updateIngredient(mealKey, idx, "qty", e.target.value)}
                  />
                  <input
                    type="number"
                    style={input}
                    placeholder="kcal"
                    value={ing.kcal || ""}
                    onChange={(e) => updateIngredient(mealKey, idx, "kcal", e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeIngredient(mealKey, idx)}
                    style={{ color: "var(--gray-400)", background: "none", border: "none", cursor: "pointer", padding: 8 }}
                    aria-label="Remove ingredient"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => addIngredient(mealKey)}
              style={{
                marginTop: 10,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: "var(--r-md)",
                border: "1px dashed var(--border)",
                background: "var(--gray-50)",
                color: "var(--gray-600)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Plus size={14} /> Add ingredient
            </button>
          </div>
        );
      })}

      <div style={card}>
        <label style={label}>Clinical notes</label>
        <textarea
          style={{ ...input, height: 96, padding: "12px", resize: "vertical" }}
          value={plan.notes}
          onChange={(e) => updatePlanField("notes", e.target.value)}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
        <button
          type="button"
          onClick={() => {}}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            borderRadius: "var(--r-md)",
            border: "1px solid var(--border)",
            background: "white",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            color: "var(--gray-700)",
          }}
        >
          <Save size={16} /> Save draft
        </button>
        <button
          type="button"
          onClick={() => {
            const payload = { plan, dailyPlan };
            sessionStorage.setItem("pendingDietPlanAssignment", JSON.stringify(payload));
            navigate("/nutritionist/assign-plan", { state: payload });
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            borderRadius: "var(--r-md)",
            border: "none",
            background: "var(--green)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            color: "white",
          }}
        >
          <Send size={16} /> Finalize & assign
        </button>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .cp-ing-row {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function CreatePlan() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState({
    name: "Laila — Low Carb Phase 2",
    goal: "lose",
    duration: "4 Weeks",
    targetKcal: 1800,
    carbs: 41,
    protein: 35,
    fat: 30,
    notes: "Avoid processed sugars.",
  });

  const totalDays = useMemo(() => {
    const map = { "1 Week": 7, "4 Weeks": 28, "6 Weeks": 42, "8 Weeks": 56 };
    return map[plan.duration] || 28;
  }, [plan.duration]);
  const [dailyPlan, setDailyPlan] = useState(() => buildDailyPlan(totalDays));
  useEffect(() => {
    setDailyPlan(buildDailyPlan(totalDays));
  }, [totalDays]);

  return (
    <CreatePlanEditor
      totalDays={totalDays}
      plan={plan}
      setPlan={setPlan}
      dailyPlan={dailyPlan}
      setDailyPlan={setDailyPlan}
      navigate={navigate}
    />
  );
}
