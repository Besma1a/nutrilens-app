import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { mealsApi } from '../../services/api';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];

const MEAL_COLORS = {
  Breakfast: { dot: '#2B5726', label: '#2B5726' },
  Lunch:     { dot: '#bdc648', label: '#bdc648' },
  Snack:     { dot: '#A50C05', label: '#A50C05' },
  Dinner:    { dot: '#F19335', label: '#F19335' },
};

const pct = (v, g) => (g > 0 ? Math.min(Math.round((v / g) * 100), 100) : 0);

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function useWindowWidth() {
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

function MacroRow({ label, consumed, goal: macroGoal, color }) {
  const percentage = pct(consumed, macroGoal);
  return (
    <div style={s.macroRow}>
      <div style={s.macroTop}>
        <span style={s.macroName}>{label}</span>
        <span style={s.macroVal}>
          {consumed}g <span style={s.macroValMuted}>/ {macroGoal}g</span>
        </span>
      </div>
      <div style={s.barTrack}>
        <div
          style={{
            ...s.barFill,
            width: `${percentage}%`,
            background: color
          }}
        />
      </div>
    </div>
  );
}

function MealCard({ meal, onAddEntry }) {
  const colors = MEAL_COLORS[meal.mealType] || MEAL_COLORS.Dinner;
  return (
    <div style={s.mealCard}>
      <div style={s.mealHead}>
        <div style={s.mealHeadLeft}>
          <div style={{ ...s.mealDot, background: colors.dot }} />
          <div style={{ ...s.mealTypeLbl, color: colors.label }}>{meal.mealType}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {!meal.empty && <div style={s.mealKcal}>{meal.totalKcal} kcal</div>}
          {meal.time && <div style={s.mealTime}>{meal.time}</div>}
        </div>
      </div>

      {meal.entries.map((entry, j) => (
        <div
          key={j}
          style={{
            ...s.entryRow,
            borderBottom: j < meal.entries.length - 1 ? '1px solid #f8fafc' : 'none',
          }}
        >
          <div style={s.entryName}>{entry.name}</div>
          <div style={s.entryKcal}>{entry.kcal} kcal</div>
        </div>
      ))}

      {meal.empty && (
        <div style={s.emptyRow}>
          <span style={s.emptyText}>Nothing logged for {meal.mealType}</span>
          <button style={s.ghostBtn} onClick={onAddEntry}>Add Entry</button>
        </div>
      )}
    </div>
  );
}

// Build the 4-section daily log from API meals array.
// Always returns all 4 meal types — empty ones show placeholder.
function buildDailyLog(apiMeals) {
  const grouped = { Breakfast: [], Lunch: [], Snack: [], Dinner: [] };

  (apiMeals || []).forEach(meal => {
    const type = meal.meal_type || 'Breakfast';
    if (!grouped[type]) grouped[type] = [];

    const entries = (meal.food_items || []).map(item => ({
      name: item.name,
      kcal: Math.round(item.calories || 0),
    }));

    if (entries.length === 0 && meal.total_calories > 0) {
      entries.push({ name: 'Meal', kcal: Math.round(meal.total_calories) });
    }

    grouped[type].push(...entries);
  });

  return MEAL_TYPES.map(type => {
    const entries = grouped[type];
    const totalKcal = entries.reduce((s, e) => s + e.kcal, 0);

    const typeMeals = (apiMeals || []).filter(m => (m.meal_type || 'Breakfast') === type);
    const latestMeal = typeMeals[0];
    const time = latestMeal?.logged_at
      ? new Date(latestMeal.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : null;

    return {
      mealType: type,
      time,
      totalKcal,
      entries,
      empty: entries.length === 0,
    };
  });
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const width = useWindowWidth();

  const [todayData, setTodayData] = useState({
    calories: { eaten: 0, goal: 2000, burned: 0 },
    protein:  { consumed: 0, goal: 120 },
    carbs:    { consumed: 0, goal: 200 },
    fat:      { consumed: 0, goal: 65  },
    meals:    { logged: 0, total: 4 },
  });
  const [dailyLog, setDailyLog] = useState(buildDailyLog([]));
  const [isLoading, setIsLoading] = useState(true);

  const firstName = user?.name?.split(' ')[0] || 'User';
  const greeting = getGreeting();

  // ── Dashboard data ─────────────────────────────────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    try {
      const [summaryResponse, todayMeals] = await Promise.all([
        mealsApi.getDailySummary(),
        mealsApi.getToday(),
      ]);

      setTodayData({
        calories: {
          eaten:  summaryResponse?.total_calories  || 0,
          goal:   summaryResponse?.goal_calories   || 2000,
          burned: 0,
        },
        protein: {
          consumed: summaryResponse?.total_protein_g || 0,
          goal:     summaryResponse?.goal_protein_g  || 120,
        },
        carbs: {
          consumed: summaryResponse?.total_carbs_g || 0,
          goal:     summaryResponse?.goal_carbs_g  || 200,
        },
        fat: {
          consumed: summaryResponse?.total_fat_g || 0,
          goal:     summaryResponse?.goal_fat_g  || 65,
        },
        meals: {
          logged: summaryResponse?.meal_count || 0,
          total:  4,
        },
      });

      setDailyLog(buildDailyLog(todayMeals));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setDailyLog(buildDailyLog([]));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Mount: fetch everything ────────────────────────────────────────────────
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ── Re-fetch when tab becomes visible (user returns from another tab) ──────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchDashboardData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchDashboardData]);

  // ── Re-fetch when window regains focus ────────────────────────────────────
  useEffect(() => {
    const handleFocus = () => {
      fetchDashboardData();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchDashboardData]);

  const { eaten, goal, burned } = todayData.calories;
  const remaining = goal - eaten;
  const isOver = eaten > goal;

  const R = 66;
  const circ = 2 * Math.PI * R;
  const arc = (Math.min(eaten, goal) / goal) * circ;
  const ringColor = isOver ? '#A50C05' : '#2B5726';
  const statusLabel = isOver ? 'EXCEEDED' : 'ON TRACK';
  const statusStyle = isOver ? s.statusOver : s.statusOn;

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const totalMacroG = todayData.protein.consumed + todayData.carbs.consumed + todayData.fat.consumed;
  const carbPct    = totalMacroG > 0 ? Math.round((todayData.carbs.consumed   / totalMacroG) * 100) : 0;
  const proteinPct = totalMacroG > 0 ? Math.round((todayData.protein.consumed / totalMacroG) * 100) : 0;
  const fatPct     = totalMacroG > 0 ? 100 - carbPct - proteinPct : 0;

  const mainGridCols = width < 960 ? '1fr' : '1fr 1.9fr';

  return (
    <div style={s.root}>
      <div style={s.container}>

        {/* Header */}
        <div style={s.header}>
          <div>
            <div style={s.pageTitle}>
              {greeting}, {firstName}
            </div>
            <div style={s.subtitle}>
              {dateStr} • Your daily overview
            </div>
          </div>

        </div>

        {/* Main grid */}
        <div style={{ ...s.mainGrid, gridTemplateColumns: mainGridCols }}>

          {/* ── Calorie ring card ── */}
          <div style={s.perfCard}>
            <div style={s.perfTitleRow}>
              <span style={s.perfTitle}>Today's Calories</span>
              <span style={{ ...s.statusPill, ...statusStyle }}>{statusLabel}</span>
            </div>

            <div style={s.ringCenter}>
              <div style={s.ringWrap}>
                <svg width="160" height="160" viewBox="0 0 160 160">
                  <circle cx="80" cy="80" r={R} fill="none" stroke="#f1f5f9" strokeWidth="12" />
                  <circle
                    cx="80" cy="80" r={R}
                    fill="none"
                    stroke={ringColor}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${arc} ${circ}`}
                    transform="rotate(-90 80 80)"
                    style={{ transition: 'stroke-dasharray 0.6s ease' }}
                  />
                </svg>
                <div style={s.ringInner}>
                  <div style={s.ringNum}>{eaten.toLocaleString()}</div>
                  <div style={s.ringLbl}>kcal eaten</div>
                </div>
              </div>
            </div>

            <div style={s.perfStats}>
              {[
                { label: 'Goal',      val: `${goal.toLocaleString()} kcal` },
                { label: isOver ? 'Over by' : 'Remaining', val: `${Math.abs(remaining).toLocaleString()} kcal` },
                { label: 'Burned',    val: `${burned} kcal` },
                { label: 'Meals',     val: `${todayData.meals.logged} / ${todayData.meals.total}` },
              ].map(({ label, val }) => (
                <div key={label} style={s.perfStat}>
                  <div style={s.perfStatLbl}>{label}</div>
                  <div style={s.perfStatVal}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Macros card ── */}
          <div style={s.macroCard}>
            <div style={s.perfTitleRow}>
              <span style={s.perfTitle}>Macronutrients</span>
            </div>

            <div style={s.macroStrip}>
              <MacroRow label="Protein" consumed={todayData.protein.consumed} goal={todayData.protein.goal} color="#2B5726" />
              <MacroRow label="Carbs"   consumed={todayData.carbs.consumed}   goal={todayData.carbs.goal}   color="#bdc648" />
              <MacroRow label="Fat"     consumed={todayData.fat.consumed}     goal={todayData.fat.goal}     color="#F19335" />
            </div>

            {/* Stacked ratio bar */}
            <div style={s.macroStackLbl}>Today's macro split</div>
            <div style={s.macroStack}>
              <div style={{ ...s.macroSeg, width: `${proteinPct}%`, background: '#2B5726' }} />
              <div style={{ ...s.macroSeg, width: `${carbPct}%`,    background: '#bdc648' }} />
              <div style={{ ...s.macroSeg, width: `${fatPct}%`,     background: '#F19335' }} />
            </div>
            <div style={s.macroLegend}>
              {[
                { label: `Protein ${proteinPct}%`, color: '#2B5726' },
                { label: `Carbs ${carbPct}%`,      color: '#bdc648' },
                { label: `Fat ${fatPct}%`,          color: '#F19335' },
              ].map(({ label, color }) => (
                <div key={label} style={s.macroLegendItem}>
                  <div style={{ ...s.legendDot, background: color }} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Daily Log */}
        <div style={s.logHeader}>
          <h2 style={s.logTitle}>Daily Log</h2>
          <button style={s.addBtn} onClick={() => navigate('/user/tracker')}>+ Add Food</button>
        </div>

        <div style={s.mealGrid}>
          {dailyLog.map((meal, i) => (
            <MealCard
              key={i}
              meal={meal}
              onAddEntry={() => navigate('/user/tracker')}
            />
          ))}
        </div>

      </div>
    </div>
  );
}

const s = {
  root: {
    fontFamily: "'Inter', sans-serif",
    background: '#ffffff',
    minHeight: '100vh',
    color: '#2B5726',
    margin: 0,
    padding: 0,
  },
  container: {
    width: '100%',
    maxWidth: '100%',
    padding: '0 16px',
    margin: 0,
  },
  header: {
    marginBottom: 32,
    paddingTop: 0,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 800,
    color: '#000',
    letterSpacing: '-0.6px',
    margin: 0,
    fontFamily: "'Outfit', sans-serif",
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(43,87,38,0.72)',
    marginTop: 6,
  },
  mainGrid: {
    display: 'grid',
    gap: 16,
    marginBottom: 24,
  },
  perfCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    padding: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  perfTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  perfTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#0f172a',
  },
  statusPill: {
    fontSize: 11,
    fontWeight: 700,
    padding: '4px 12px',
    borderRadius: 20,
    letterSpacing: '0.04em',
  },
  statusOn:   { background: '#DEE66033', color: '#2B5726' },
  statusOver: { background: '#A50C0533', color: '#A50C05' },
  ringCenter: { display: 'flex', justifyContent: 'center', marginBottom: 20 },
  ringWrap:   { position: 'relative', width: 160, height: 160 },
  ringInner: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringNum: {
    fontSize: 32,
    fontWeight: 800,
    color: '#0f172a',
    lineHeight: 1,
  },
  ringLbl: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: '#94a3b8',
    marginTop: 4,
  },
  perfStats: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  perfStat: {
    background: '#ffffff',
    borderRadius: 10,
    padding: 14,
    textAlign: 'center',
  },
  perfStatLbl: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: '#94a3b8',
    marginBottom: 4,
  },
  perfStatVal: {
    fontSize: 20,
    fontWeight: 700,
    color: '#0f172a',
  },
  macroCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    padding: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  macroStrip: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
    marginBottom: 20,
    marginTop: 16,
  },
  macroRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  macroTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  macroName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#334155',
  },
  macroVal: {
    fontSize: 15,
    fontWeight: 700,
    color: '#0f172a',
  },
  macroValMuted: {
    color: '#94a3b8',
    fontWeight: 400,
  },
  barTrack: {
    height: 6,
    background: '#f1f5f9',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 9999,
    transition: 'width 0.4s ease',
  },
  macroStackLbl: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 8,
  },
  macroStack: {
    height: 8,
    background: '#f1f5f9',
    borderRadius: 9999,
    display: 'flex',
    overflow: 'hidden',
    marginBottom: 10,
  },
  macroSeg: { height: '100%' },
  macroLegend: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 16,
  },
  macroLegendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: '#64748b',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
  },
  miniStatsRow: { marginTop: 8 },
  logHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: '28px 0 12px 0',
  },
  logTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  addBtn: {
    background: '#2B5726',
    color: '#fff',
    border: 'none',
    padding: '9px 18px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  mealGrid: { display: 'flex', flexDirection: 'column', gap: 12 },
  mealCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  mealHead: {
    padding: '14px 20px',
    background: '#fcfdfe',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #f1f5f9',
  },
  mealHeadLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  mealDot:      { width: 8, height: 8, borderRadius: '50%' },
  mealTypeLbl: {
    fontSize: 13,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  mealKcal: { fontSize: 14, fontWeight: 700, color: '#0f172a' },
  mealTime: { fontSize: 12, color: '#94a3b8' },
  entryRow: {
    padding: '13px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryName: {
    fontSize: 14,
    fontWeight: 500,
    color: '#334155',
  },
  entryKcal: {
    fontSize: 14,
    fontWeight: 600,
    color: '#475569',
  },
  emptyRow: {
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyText: { fontSize: 13, color: '#94a3b8' },
  ghostBtn: {
    background: 'none',
    border: '1px dashed #cbd5e1',
    color: '#64748b',
    padding: '7px 14px',
    borderRadius: 6,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
};