import { useEffect, useMemo, useState } from "react";
import { dietPlansApi } from "../../services/api";

const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SLOT_LABELS = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snack",
};
const SLOT_TIME = {
  breakfast: "7:00 AM",
  lunch: "12:30 PM",
  dinner: "7:00 PM",
  snacks: "3:30 PM",
};
const SLOT_TAG = {
  breakfast: "green",
  lunch: "blue",
  dinner: "orange",
  snacks: "red",
};

const TAG = {
  green:  { bar: '#2d7a4f', typeColor: '#1a5c38' },
  blue:   { bar: '#3b7fd4', typeColor: '#1e4f91' },
  orange: { bar: '#e07b2a', typeColor: '#b85e15' },
  red:    { bar: '#d94040', typeColor: '#a52020' },
};

export default function MealPlan() {
  const [planData, setPlanData] = useState([]);
  const [dayIdx, setDayIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadPlan = async () => {
      try {
        setIsLoading(true);
        setError("");
        const activePlan = await dietPlansApi.getActive();
        const dailyPlan = Array.isArray(activePlan?.meals_data) ? activePlan.meals_data : [];
        const transformed = dailyPlan.map((dayItem, index) => {
          const meals = Object.keys(SLOT_LABELS).map((slotKey) => {
            const meal = dayItem?.meals?.[slotKey] || {};
            const ingredients = Array.isArray(meal.ingredients) ? meal.ingredients : [];
            return {
              type: SLOT_LABELS[slotKey],
              time: SLOT_TIME[slotKey],
              name: meal.mealName || `${SLOT_LABELS[slotKey]} meal`,
              ingredients: ingredients.map((ing) => ({
                name: ing.name || "Ingredient",
                qty: ing.qty || "—",
                kcal: Number(ing.kcal) || 0,
              })),
              totalKcal: Number(meal.targetKcal) || ingredients.reduce((acc, ing) => acc + (Number(ing.kcal) || 0), 0),
              tag: SLOT_TAG[slotKey],
              slotKey,
              dayIndex: index,
            };
          });
          return {
            day: WEEK_DAYS[index % 7],
            goal: activePlan?.title || "Active Plan",
            totalKcal: Number(activePlan?.daily_calorie_target) || meals.reduce((acc, m) => acc + m.totalKcal, 0),
            meals,
          };
        });
        setPlanData(transformed);
      } catch (err) {
        setError(err?.message || "Failed to load your active meal plan.");
      } finally {
        setIsLoading(false);
      }
    };

    loadPlan();
  }, []);

  const day = useMemo(() => planData[dayIdx] || null, [planData, dayIdx]);

  if (isLoading) {
    return <div className="mp"><style>{CSS}</style><div className="mp-cards">Loading meal plan...</div></div>;
  }

  if (error) {
    return <div className="mp"><style>{CSS}</style><div className="mp-cards">{error}</div></div>;
  }

  if (!day) {
    return <div className="mp"><style>{CSS}</style><div className="mp-cards">No active meal plan assigned yet.</div></div>;
  }

  return (
    <div className="mp">
      <style>{CSS}</style>

      {/* ── HEADER (NON-STICKY) ── */}
      <div className="mp-sticky">
        <div className="mp-sticky-inner">
          <div className="mp-sticky-left">
            <h1 className="mp-heading">{day.day}'s Meal Plan</h1>
            <span className="mp-goal-chip">{day.goal}</span>
          </div>
          <div className="mp-sticky-right">
            <div className="mp-kcal-badge">
              <span className="mp-kcal-num">{day.totalKcal.toLocaleString()}</span>
              <span className="mp-kcal-lbl">kcal / day</span>
            </div>
          </div>
        </div>

        <nav className="mp-nav">
          <button className="mp-nav-btn" onClick={() => setDayIdx(Math.max(0, dayIdx - 1))} disabled={dayIdx === 0}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
            <span className="mp-nav-label">Previous Day</span>
          </button>
          <div className="mp-nav-center">
            <div className="mp-nav-dots">
              {planData.map((p, i) => (
                <button key={i} className={`mp-dot${i === dayIdx ? ' mp-dot-on' : ''}`} onClick={() => setDayIdx(i)} title={p.day} />
              ))}
            </div>
            <span className="mp-nav-day">{day.day}</span>
          </div>
          <button className="mp-nav-btn" onClick={() => setDayIdx(Math.min(planData.length - 1, dayIdx + 1))} disabled={dayIdx === planData.length - 1}>
            <span className="mp-nav-label">Next Day</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </nav>
      </div>

      <section className="mp-cards">
        {day.meals.map((meal, i) => {
          const t = TAG[meal.tag];
          return (
            <article key={i} className="mp-card">
              <div className="mp-bar" style={{ background: t.bar }} />
              <div className="mp-body">
                <div className="mp-head">
                  <div className="mp-meta">
                    <span className="mp-type" style={{ color: t.typeColor }}>{meal.type}</span>
                    <span className="mp-time">{meal.time}</span>
                  </div>
                  <div className="mp-title-row">
                    <h2 className="mp-name">{meal.name}</h2>
                    <div className="mp-mkcal">
                      <span className="mp-mkcal-num">{meal.totalKcal}</span>
                      <span className="mp-mkcal-lbl">kcal</span>
                    </div>
                  </div>
                </div>
                <ul className="mp-ings">
                  {meal.ingredients.map((ing, j) => (
                    <li key={j} className="mp-ing">
                      <span className="mp-qty">{ing.qty}</span>
                      <span className="mp-iname">{ing.name}</span>
                      <span className="mp-ical">{ing.kcal} kcal</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Fira+Mono:wght@400;500&display=swap');

.mp *, .mp *::before, .mp *::after { box-sizing: border-box; margin: 0; padding: 0; }

.mp {
  font-family: 'Sora', sans-serif;
  background: #fff;
  min-height: 100vh;
  width: 100%;
  color: #0f172a;
}

/* ── HEADER (REMOVED STICKY) ── */
.mp-sticky {
  position: relative;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  padding: 20px 32px 0;
}
.mp-sticky-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.mp-sticky-left  { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.mp-sticky-right { display: flex; align-items: center; }

.mp-heading { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #0f172a; }
.mp-goal-chip {
  font-size: 10px; font-weight: 700; letter-spacing: 0.9px; text-transform: uppercase;
  background: #e8f5ee; color: #1a5c38; border: 1px solid #b6ddc8;
  padding: 3px 11px; border-radius: 99px; white-space: nowrap;
}
.mp-kcal-badge { display: flex; align-items: baseline; gap: 5px; }
.mp-kcal-num {
  font-size: 28px; font-weight: 800; color: #1a5c38;
  font-family: 'Fira Mono', monospace; letter-spacing: -1px;
}
.mp-kcal-lbl { font-size: 12px; font-weight: 500; color: #94a3b8; }

.mp-nav {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 0 14px;
}
.mp-nav-btn {
  display: flex; align-items: center; gap: 6px;
  background: none; border: none; font-family: 'Sora', sans-serif;
  font-size: 13px; font-weight: 600; color: #334155;
  cursor: pointer; padding: 5px 10px; border-radius: 8px;
  transition: background .15s, color .15s;
}
.mp-nav-btn:hover:not(:disabled) { background: #e8f5ee; color: #1a5c38; }
.mp-nav-btn:disabled { color: #cbd5e1; cursor: not-allowed; }
.mp-nav-center { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.mp-nav-dots { display: flex; gap: 6px; }
.mp-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #e2e8f0; border: none; cursor: pointer;
  transition: background .2s, transform .2s;
}
.mp-dot:hover { background: #94a3b8; }
.mp-dot-on { background: #2d7a4f !important; transform: scale(1.4); }
.mp-nav-day { font-size: 11px; font-weight: 600; color: #94a3b8; }

.mp-cards {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 24px 32px 64px;
  width: 100%;
}

.mp-card {
  display: flex;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: 14px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
  transition: box-shadow .2s;
  width: 100%;
}
.mp-card:last-child { margin-bottom: 0; }
.mp-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.09); }

.mp-bar { width: 5px; flex-shrink: 0; }
.mp-body { flex: 1; min-width: 0; }

.mp-head {
  padding: 20px 28px 14px;
  border-bottom: 1px solid #f1f5f9;
}
.mp-meta { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.mp-type  { font-size: 10px; font-weight: 800; letter-spacing: 1.3px; text-transform: uppercase; }
.mp-time  { font-size: 11px; color: #94a3b8; font-weight: 500; padding-left: 10px; border-left: 1px solid #e2e8f0; }

.mp-title-row { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.mp-name { font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px; line-height: 1.25; }
.mp-mkcal { display: flex; align-items: baseline; gap: 3px; flex-shrink: 0; }
.mp-mkcal-num { font-size: 21px; font-weight: 800; color: #0f172a; font-family: 'Fira Mono', monospace; letter-spacing: -0.8px; }
.mp-mkcal-lbl { font-size: 11px; font-weight: 600; color: #94a3b8; }

.mp-ings { list-style: none; padding: 6px 28px 16px; }
.mp-ing {
  display: grid;
  grid-template-columns: 54px 1fr 72px;
  align-items: center;
  gap: 12px;
  padding: 9px 0;
  border-bottom: 1px solid #f8fafc;
}
.mp-ing:last-child { border-bottom: none; }
.mp-qty   { font-size: 11px; font-weight: 700; color: #94a3b8; font-family: 'Fira Mono', monospace; white-space: nowrap; }
.mp-iname { font-size: 13.5px; font-weight: 500; color: #334155; }
.mp-ical  { font-size: 12px; font-weight: 500; color: #94a3b8; text-align: right; font-family: 'Fira Mono', monospace; }

@media (max-width: 600px) {
  .mp-sticky { padding: 16px 16px 0; }
  .mp-cards  { padding: 20px 16px 56px; }
  .mp-heading { font-size: 18px; }
  .mp-kcal-num { font-size: 22px; }
  .mp-nav-label { display: none; }
  .mp-head { padding: 16px 16px 12px; }
  .mp-name { font-size: 15px; }
  .mp-mkcal-num { font-size: 17px; }
  .mp-ings { padding: 4px 16px 12px; }
  .mp-ing { grid-template-columns: 44px 1fr 60px; gap: 8px; }
  .mp-iname { font-size: 12px; }
}
`;