import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/layout/Toast';
import { useNavigate } from 'react-router-dom';
import { useModalA11y } from '../../hooks/useModalA11y';
import { mealsApi, profileApi } from '../../services/api';

const DIARY_INIT = {
  Breakfast: [],
  Lunch: [],
  Snack: [],
  Dinner: [],
};

const FOOD_DB = [
  { name: 'Banana (1 medium, 118g)',        kcal: 89,  p: 1,  c: 23, f: 0  },
  { name: 'Chicken Breast, grilled (100g)', kcal: 165, p: 31, c: 0,  f: 4  },
  { name: 'Greek Yogurt, plain (150g)',     kcal: 100, p: 17, c: 6,  f: 0  },
  { name: 'Brown Rice, cooked (1 cup)',     kcal: 216, p: 5,  c: 45, f: 2  },
  { name: 'Avocado (½ medium)',             kcal: 120, p: 1,  c: 6,  f: 11 },
  { name: 'Atlantic Salmon, baked (180g)',  kcal: 360, p: 38, c: 0,  f: 22 },
  { name: 'Egg, large (1 whole)',           kcal: 72,  p: 6,  c: 0,  f: 5  },
  { name: 'Broccoli, steamed (1 cup)',      kcal: 55,  p: 4,  c: 11, f: 1  },
  { name: 'Sweet Potato, baked (medium)',   kcal: 103, p: 2,  c: 24, f: 0  },
  { name: 'Blueberries (1 cup)',            kcal: 84,  p: 1,  c: 21, f: 0  },
];

const MEAL_SECTIONS = [
  { key: 'Breakfast', label: 'Breakfast', time: '7:30–9:00 AM',  tag: 'BF' },
  { key: 'Lunch',     label: 'Lunch',     time: '12:00–1:30 PM', tag: 'LN' },
  { key: 'Snack',     label: 'Snack',     time: '3:30–4:30 PM',  tag: 'SN' },
  { key: 'Dinner',    label: 'Dinner',    time: '6:30–8:00 PM',  tag: 'DN' },
];

const SCAN_RESULTS = [
  { name: 'Salmon Avocado Bowl',           quantity: 1, measure: 'bowl',  info: 'AI Scanned', p: 28, c: 38, f: 18, fiber: 3, kcal: 430, netWt: 350, confidence: 92 },
  { name: 'Caesar Salad with Chicken',     quantity: 1, measure: 'salad', info: 'AI Scanned', p: 32, c: 14, f: 20, fiber: 4, kcal: 360, netWt: 280, confidence: 87 },
  { name: 'Chicken Curry with Brown Rice', quantity: 1, measure: 'bowl',  info: 'AI Scanned', p: 40, c: 52, f: 14, fiber: 5, kcal: 490, netWt: 400, confidence: 95 },
];

// ─── helpers ────────────────────────────────────────────────────────────────

const getProgressGradient = (percent) => {
  if (percent < 50) return 'linear-gradient(90deg, #ef4444, #f87171)';
  if (percent < 80) return 'linear-gradient(90deg, #eab308, #facc15)';
  return 'linear-gradient(90deg, var(--g1), var(--g2))';
};

const getConfidenceMeta = (confidence) => {
  if (confidence >= 90) return { label: 'High confidence',   color: '#059669', bar: 'linear-gradient(90deg,#10b981,#34d399)' };
  if (confidence >= 75) return { label: 'Medium confidence', color: '#d97706', bar: 'linear-gradient(90deg,#f59e0b,#fbbf24)' };
  return                        { label: 'Low confidence',   color: '#dc2626', bar: 'linear-gradient(90deg,#ef4444,#f87171)' };
};

const formatTime = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// ─── validators ─────────────────────────────────────────────────────────────

const validateCalories = (value) => {
  const num = parseFloat(value);
  if (isNaN(num) || num <= 0) return 'Calories must be a positive number';
  if (num > 10000) return 'Calories seem too high';
  return null;
};

const validateMacro = (value, fieldName = 'Value') => {
  const num = parseFloat(value);
  if (isNaN(num) || num < 0) return `${fieldName} must be non-negative`;
  if (num > 1000) return `${fieldName} too high (max 1000g)`;
  return null;
};

// ─── Parse API meals into diary structure ────────────────────────────────────
// Each diary entry also stores the meal's DB id so we can delete it later.
function parseMealsToDiary(todayMeals) {
  const diary = { Breakfast: [], Lunch: [], Snack: [], Dinner: [] };

  (todayMeals || []).forEach(meal => {
    const mealType = meal.meal_type || 'Breakfast';
    if (!diary[mealType]) return;

    const items = (meal.food_items || []).map(item => ({
      name:       item.name,
      info:       item.confidence ? `${Math.round(item.quantity_g || 0)}g · AI Scanned` : 'Manual entry',
      p:          Math.round(item.protein_g || 0),
      c:          Math.round(item.carbs_g   || 0),
      f:          Math.round(item.fat_g     || 0),
      kcal:       Math.round(item.calories  || 0),
      timestamp:  meal.logged_at,
      confidence: item.confidence,
      mealId:     meal.id,   // ← store the meal DB id for deletion
    }));

    // If the meal has total_calories but no food_items (e.g. older manual entry)
    if (items.length === 0 && meal.total_calories > 0) {
      items.push({
        name:      'Meal',
        info:      'Manual entry',
        p:         Math.round(meal.total_protein_g || 0),
        c:         Math.round(meal.total_carbs_g   || 0),
        f:         Math.round(meal.total_fat_g     || 0),
        kcal:      Math.round(meal.total_calories  || 0),
        timestamp: meal.logged_at,
        confidence: null,
        mealId:    meal.id,
      });
    }

    diary[mealType].push(...items);
  });

  return diary;
}

// ─── component ───────────────────────────────────────────────────────────────

export default function Tracker() {
  const { user, recordScan } = useAuth();
  const toast    = useToast();
  const navigate = useNavigate();

  const [diary,        setDiary]        = useState(DIARY_INIT);
  const [modal,        setModal]        = useState(null);
  const [addTo,        setAddTo]        = useState('Breakfast');
  const [q,            setQ]            = useState('');
  const [scanning,     setScanning]     = useState(false);
  const [scanResult,   setScanResult]   = useState(null);
  const [editingScan,  setEditingScan]  = useState(false);
  const [scanEdit,     setScanEdit]     = useState({});
  const [manual,       setManual]       = useState({ name: '', kcal: '', p: '', c: '', f: '' });
  const [dragOver,     setDragOver]     = useState(false);
  const [hoverMeal,    setHoverMeal]    = useState(null);
  const [loading,      setLoading]      = useState(true);

  // Goals from profile (dynamic)
  const [calorieGoal,  setCalorieGoal]  = useState(2000);
  const [proteinGoal,  setProteinGoal]  = useState(120);
  const [carbsGoal,    setCarbsGoal]    = useState(200);
  const [fatGoal,      setFatGoal]      = useState(65);

  // ── Shared refresh helper ──────────────────────────────────────────────────
  const refreshDiary = useCallback(async () => {
    const todayMeals = await mealsApi.getToday();
    setDiary(parseMealsToDiary(todayMeals));
  }, []);

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        // Fetch profile goals and today's meals in parallel
        const [profile, todayMeals] = await Promise.all([
          profileApi.getProfile(),
          mealsApi.getToday(),
        ]);

        // Apply profile goals
        if (profile?.daily_calorie_goal) setCalorieGoal(profile.daily_calorie_goal);
        if (profile?.protein_goal_g)     setProteinGoal(profile.protein_goal_g);
        if (profile?.carbs_goal_g)       setCarbsGoal(profile.carbs_goal_g);
        if (profile?.fat_goal_g)         setFatGoal(profile.fat_goal_g);

        setDiary(parseMealsToDiary(todayMeals));
      } catch (error) {
        console.error("Failed to load tracker data:", error);
        toast({ message: 'Failed to load meals', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [toast]);

  // ── Computed totals ────────────────────────────────────────────────────────
  const allItems  = Object.values(diary).flat();
  const totalKcal = allItems.reduce((s, i) => s + i.kcal, 0);
  const totalP    = allItems.reduce((s, i) => s + i.p,    0);
  const totalC    = allItems.reduce((s, i) => s + i.c,    0);
  const totalF    = allItems.reduce((s, i) => s + i.f,    0);
  const calPct = Math.min(Math.round((totalKcal / calorieGoal) * 100), 100);

  const canScan        = user.isSubscribed || user.scansUsedToday < 3;
  const scansRemaining = Math.max(0, 3 - user.scansUsedToday);

  const openAdd = useCallback((mealKey) => {
    setAddTo(mealKey);
    setModal('scan');
    setScanResult(null);
    setEditingScan(false);
  }, []);

  const closeModal = useCallback(() => {
    setModal(null);
    setScanResult(null);
    setQ('');
    setScanning(false);
    setEditingScan(false);
    setScanEdit({});
  }, []);

  const addFoodModalRef = useModalA11y(!!modal, closeModal);

  // ── Remove item — deletes the meal from the backend ──────────────────────
  const removeItem = useCallback(async (meal, idx) => {
    const item = diary[meal]?.[idx];
    if (!item) return;

    // Optimistically remove from UI
    setDiary(d => ({ ...d, [meal]: d[meal].filter((_, i) => i !== idx) }));

    try {
      if (item.mealId) {
        await mealsApi.deleteMeal(item.mealId);
      }
      toast({ message: 'Item removed', type: 'success' });
      // Refresh to stay in sync (other items from same meal should be untouched)
      await refreshDiary();
    } catch (err) {
      toast({ message: err.message || 'Failed to remove item', type: 'error' });
      // Revert on error
      await refreshDiary();
    }
  }, [diary, toast, refreshDiary]);

  // ── Add from food DB (Search tab) ─────────────────────────────────────────
  const addFromDB = useCallback(async (food) => {
    try {
      if (!food?.name) throw new Error('Invalid food');

      await mealsApi.createManual({
        meal_type:       addTo,
        total_calories:  food.kcal,
        total_protein_g: food.p,
        total_carbs_g:   food.c,
        total_fat_g:     food.f,
        food_items: [{
          name:        food.name,
          calories:    food.kcal,
          protein_g:   food.p,
          carbs_g:     food.c,
          fat_g:       food.f,
          quantity_g:  100,
          confidence:  null,
        }],
      });

      toast({ message: `${food.name.split(' ')[0]} added`, type: 'success' });
      closeModal();
      await refreshDiary();
    } catch (err) {
      toast({ message: err.message || 'Failed to add food', type: 'error' });
    }
  }, [addTo, toast, closeModal, refreshDiary]);

  // ── AI scan (mock) ────────────────────────────────────────────────────────
  const fakeScan = useCallback(() => {
    try {
      if (!user.isSubscribed && user.scansUsedToday >= 3) {
        toast({ message: '3 scans used. Upgrade to Premium', type: 'warning' });
        navigate('/user/subscribe');
        return;
      }
      setScanning(true);
      setTimeout(() => {
        setScanning(false);
        try {
          recordScan();
          const r = SCAN_RESULTS[Math.floor(Math.random() * SCAN_RESULTS.length)];
          setScanResult(r);
          setScanEdit({
            name:       r.name,
            quantity:   r.quantity,
            measure:    r.measure,
            kcal:       r.kcal,
            p:          r.p,
            c:          r.c,
            f:          r.f,
            fiber:      r.fiber,
            netWt:      r.netWt,
            confidence: r.confidence,
          });
        } catch (err) {
          toast({ message: err.message, type: 'error' });
        }
      }, 1800);
    } catch (err) {
      setScanning(false);
      toast({ message: err.message, type: 'error' });
    }
  }, [user.isSubscribed, user.scansUsedToday, recordScan, toast, navigate]);

  const applyScanEdit = useCallback(() => {
    try {
      if (!scanEdit.name?.trim()) { toast({ message: 'Enter food name', type: 'warning' }); return; }

      const kcal = parseFloat(scanEdit.kcal);
      const p    = parseFloat(scanEdit.p || 0);
      const c    = parseFloat(scanEdit.c || 0);
      const f    = parseFloat(scanEdit.f || 0);

      const calorieErr = validateCalories(kcal); if (calorieErr) { toast({ message: calorieErr, type: 'warning' }); return; }
      const pErr = validateMacro(p, 'Protein');  if (pErr)       { toast({ message: pErr,       type: 'warning' }); return; }
      const cErr = validateMacro(c, 'Carbs');    if (cErr)       { toast({ message: cErr,       type: 'warning' }); return; }
      const fErr = validateMacro(f, 'Fat');      if (fErr)       { toast({ message: fErr,       type: 'warning' }); return; }

      setScanResult({
        name:       scanEdit.name.trim(),
        quantity:   scanEdit.quantity || 1,
        measure:    scanEdit.measure  || 'unit',
        info:       'AI Scanned · Edited',
        p:          Math.round(p),
        c:          Math.round(c),
        f:          Math.round(f),
        fiber:      Math.round(parseFloat(scanEdit.fiber) || 0),
        kcal:       Math.round(kcal),
        netWt:      Math.round(parseFloat(scanEdit.netWt) || 0),
        confidence: scanEdit.confidence,
      });
      setEditingScan(false);
      toast({ message: 'Changes applied', type: 'success' });
    } catch (err) {
      toast({ message: err.message, type: 'error' });
    }
  }, [scanEdit, toast]);

  // ── Add scan result ───────────────────────────────────────────────────────
  const addScanResult = useCallback(async () => {
    try {
      if (!scanResult)            throw new Error('No scan result');
      if (!scanResult.name?.trim()) throw new Error('Invalid food');

      await mealsApi.createManual({
        meal_type:       addTo,
        total_calories:  scanResult.kcal,
        total_protein_g: scanResult.p,
        total_carbs_g:   scanResult.c,
        total_fat_g:     scanResult.f,
        food_items: [{
          name:        scanResult.name,
          calories:    scanResult.kcal,
          protein_g:   scanResult.p,
          carbs_g:     scanResult.c,
          fat_g:       scanResult.f,
          quantity_g:  scanResult.netWt || 100,
          confidence:  scanResult.confidence,
        }],
      });

      toast({ message: `${scanResult.name} added`, type: 'success' });
      closeModal();
      await refreshDiary();
    } catch (err) {
      toast({ message: err.message || 'Failed to add scan result', type: 'error' });
    }
  }, [scanResult, addTo, toast, closeModal, refreshDiary]);

  // ── Add manual entry ──────────────────────────────────────────────────────
  const addManual = useCallback(async () => {
    try {
      if (!manual.name?.trim()) { toast({ message: 'Enter food name', type: 'warning' }); return; }

      const kcalErr = validateCalories(manual.kcal); if (kcalErr) { toast({ message: kcalErr, type: 'warning' }); return; }
      const pErr    = validateMacro(manual.p, 'Protein'); if (pErr) { toast({ message: pErr,    type: 'warning' }); return; }
      const cErr    = validateMacro(manual.c, 'Carbs');   if (cErr) { toast({ message: cErr,    type: 'warning' }); return; }
      const fErr    = validateMacro(manual.f, 'Fat');     if (fErr) { toast({ message: fErr,    type: 'warning' }); return; }

      await mealsApi.createManual({
        meal_type:       addTo,
        total_calories:  parseInt(manual.kcal),
        total_protein_g: parseInt(manual.p) || 0,
        total_carbs_g:   parseInt(manual.c) || 0,
        total_fat_g:     parseInt(manual.f) || 0,
        food_items: [{
          name:        manual.name.trim(),
          calories:    parseInt(manual.kcal),
          protein_g:   parseInt(manual.p) || 0,
          carbs_g:     parseInt(manual.c) || 0,
          fat_g:       parseInt(manual.f) || 0,
          quantity_g:  100,
          confidence:  null,
        }],
      });

      toast({ message: `${manual.name.trim()} added`, type: 'success' });
      closeModal();
      setManual({ name: '', kcal: '', p: '', c: '', f: '' });
      await refreshDiary();
    } catch (err) {
      toast({ message: err.message || 'Failed to add manual entry', type: 'error' });
    }
  }, [manual, addTo, toast, closeModal, refreshDiary]);

  const filtered = FOOD_DB.filter(f =>
    !q || f.name.toLowerCase().includes(q.toLowerCase())
  );

  // ─── render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative' }}>
      <div className="g21" style={{ gap: 28, gridTemplateColumns: '1fr' }}>
        <div className="col" style={{ minWidth: 0, width: '100%' }}>

          {/* ── Summary bar ── */}
          <div className="tracker-summary">
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <div className="stat-lbl">Calories Consumed</div>
                <div style={{ fontFamily: 'var(--font)', fontSize: 30, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-.7px', lineHeight: 1 }}>
                  {totalKcal.toLocaleString()} <span style={{ fontSize: 16, fontWeight: 400, color: 'var(--ink-5)' }}>/ {calorieGoal} kcal</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font)', fontSize: 14, fontWeight: 700, color: totalKcal > calorieGoal ? 'var(--red)' : 'var(--g1)' }}>
                  {calorieGoal - totalKcal > 0 ? `${calorieGoal - totalKcal} remaining` : 'Goal reached'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-5)', marginTop: 2 }}>{calPct}% of daily goal</div>
              </div>
            </div>
            <div className="pb" style={{ height: 8, marginBottom: 16, borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
              <div className="pb-fill" style={{ width: `${calPct}%`, height: 8, background: getProgressGradient(calPct), transition: 'width 0.3s ease, background 0.3s ease' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
              {[
                { label: 'Protein', val: totalP, goal: proteinGoal, bar: 'linear-gradient(90deg,var(--g1),var(--g2))',  pct: Math.min(Math.round((totalP / proteinGoal) * 100), 100) },
                { label: 'Carbs',   val: totalC, goal: carbsGoal,   bar: 'linear-gradient(90deg,#2563eb,#60a5fa)',       pct: Math.min(Math.round((totalC / carbsGoal)   * 100), 100) },
                { label: 'Fats',    val: totalF, goal: fatGoal,     bar: 'linear-gradient(90deg,#d97706,#fbbf24)',       pct: Math.min(Math.round((totalF / fatGoal)     * 100), 100) },
              ].map((m) => (
                <div key={m.label}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: 'var(--ink-5)', marginBottom: 8, fontFamily: 'var(--font)' }}>{m.label}</div>
                  <div style={{ fontFamily: 'var(--font)', fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginBottom: 6 }}>
                    {m.val}g <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--ink-5)' }}>/ {m.goal}g</span>
                  </div>
                  <div className="pb-sm" style={{ height: 6, borderRadius: 'var(--r-sm)', overflow: 'hidden' }}>
                    <div className="pb-sm-fill" style={{ width: `${m.pct}%`, background: m.bar, transition: 'width 0.3s ease' }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--ink-5)', marginTop: 4, fontWeight: 600 }}>{m.pct}% target</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Meal sections ── */}
          {MEAL_SECTIONS.map(section => (
            <div
              className="meal-section"
              key={section.key}
              style={{
                background: hoverMeal === section.key ? 'var(--ink-9)' : 'transparent',
                transition: 'background 0.2s ease',
                borderRadius: 'var(--r-lg)',
                padding: hoverMeal === section.key ? 16 : 12,
                marginBottom: 12,
              }}
              onMouseEnter={() => setHoverMeal(section.key)}
              onMouseLeave={() => setHoverMeal(null)}
            >
              <div className="meal-section-head" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, padding: '3px 8px', background: 'var(--g-light)', color: 'var(--g-text)', borderRadius: 'var(--r-sm)', fontFamily: 'var(--font)' }}>{section.tag}</div>
                  <div>
                    <div className="meal-section-title" style={{ fontSize: 15, fontWeight: 700 }}>{section.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-5)', marginTop: 2 }}>{section.time}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {diary[section.key]?.length > 0
                    ? <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--g1)', fontFamily: 'var(--font)' }}>{diary[section.key].reduce((s, i) => s + i.kcal, 0)} kcal</div>
                    : <div style={{ fontSize: 12, color: 'var(--ink-5)' }}>Not logged</div>
                  }
                  <button
                    className="btn btn-prim btn-xs"
                    onClick={() => openAdd(section.key)}
                    style={{ opacity: hoverMeal === section.key ? 1 : 0.8, transition: 'all 0.2s ease' }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ width: 10, height: 10 }}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Add Food
                  </button>
                </div>
              </div>

              <div className="meal-section-body">
                {diary[section.key]?.length > 0
                  ? diary[section.key].map((item, j) => {
                      const confMeta = item.confidence != null ? getConfidenceMeta(item.confidence) : null;
                      return (
                        <div
                          className="meal-row"
                          key={j}
                          style={{
                            padding: 12,
                            borderRadius: 'var(--r-md)',
                            marginBottom: 8,
                            background: 'var(--ink-9)',
                            border: '1px solid var(--border)',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ink-8)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--ink-9)'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: 'var(--ink-2)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font)' }}>
                              {item.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                              <div style={{ fontSize: 11, color: 'var(--ink-5)' }}>{item.info}</div>
                              {item.timestamp && (
                                <div style={{ fontSize: 10, color: 'var(--ink-5)', display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 10, height: 10 }}>
                                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                  </svg>
                                  {formatTime(item.timestamp)}
                                </div>
                              )}
                              {confMeta && (
                                <div style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: 'var(--r-sm)',
                                  background: confMeta.color + '18',
                                  color: confMeta.color,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 3,
                                }}>
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ width: 9, height: 9 }}>
                                    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" /><path d="M12 8v4l2 2" />
                                  </svg>
                                  {item.confidence}% AI
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0, marginLeft: 16 }}>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 8px', background: '#dcfce7', color: '#166534', borderRadius: 'var(--r-sm)' }}>P {item.p}g</span>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 8px', background: '#dbeafe', color: '#1e40af', borderRadius: 'var(--r-sm)' }}>C {item.c}g</span>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 8px', background: '#fef3c7', color: '#92400e', borderRadius: 'var(--r-sm)' }}>F {item.f}g</span>
                            </div>
                            <div style={{ textAlign: 'right', minWidth: 50 }}>
                              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--g1)', fontFamily: 'var(--font)' }}>{item.kcal}</div>
                              <div style={{ fontSize: 9, color: 'var(--ink-5)' }}>kcal</div>
                            </div>
                            <button
                              className="btn btn-ghost btn-xs"
                              style={{ color: 'var(--ink-5)', padding: '4px 6px', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
                              onClick={() => removeItem(section.key, j)}
                              title="Remove item"
                              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--red)'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ink-5)'}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      );
                    })
                  : <div style={{ fontSize: 12, color: 'var(--ink-5)', padding: '12px', fontStyle: 'italic', textAlign: 'center' }}>
                      No items logged yet
                    </div>
                }
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Modal ── */}
      {modal && (
        <div
          ref={addFoodModalRef}
          className="modal-bg open"
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tracker-add-food-title"
            style={{ width: 560, maxWidth: 'calc(100vw - 32px)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-head">
              <div className="modal-title" id="tracker-add-food-title">Add Food</div>
              <button type="button" className="modal-close" onClick={closeModal} aria-label="Close">✕</button>
            </div>

            {/* Tab strip */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 22px' }}>
              {[
                { key: 'scan',   label: 'AI Scan'  },
                { key: 'search', label: 'Search'   },
                { key: 'manual', label: 'Manual'   },
              ].map(t => (
                <button key={t.key} type="button"
                  onClick={() => { setModal(t.key); setScanResult(null); setScanning(false); setEditingScan(false); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '11px 14px', fontSize: 12.5, fontWeight: modal === t.key ? 700 : 500,
                    color: modal === t.key ? 'var(--g-text)' : 'var(--ink-4)',
                    borderBottom: `2.5px solid ${modal === t.key ? 'var(--g2)' : 'transparent'}`,
                    marginBottom: -1, fontFamily: 'inherit', transition: 'all .15s',
                  }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Meal selector */}
            <div style={{ padding: '12px 22px', borderBottom: '1px solid var(--border)' }}>
              <label className="inp-label">Adding to</label>
              <select className="inp" value={addTo} onChange={e => setAddTo(e.target.value)}>
                {Object.keys(diary).map(k => <option key={k}>{k}</option>)}
              </select>
            </div>

            <div style={{ padding: '20px 22px 22px' }}>

              {/* ── AI Scan panel ── */}
              {modal === 'scan' && (
                <div>
                  {!user.isSubscribed && (
                    <div style={{ background: 'var(--yellow-bg)', border: '1px solid #fde68a', borderRadius: 'var(--r-md)', padding: '12px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, color: '#92400e', flexShrink: 0 }}>
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>{scansRemaining} scans remaining</div>
                        <div style={{ fontSize: 11, color: '#b45309', marginTop: 2 }}>Upgrade to Premium for unlimited</div>
                      </div>
                      <button className="btn btn-amber btn-xs" onClick={() => navigate('/user/subscribe')} style={{ marginLeft: 'auto', flexShrink: 0 }}>Upgrade</button>
                    </div>
                  )}

                  {!scanResult ? (
                    <>
                      <div
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={e => { e.preventDefault(); setDragOver(false); fakeScan(); }}
                        onClick={fakeScan}
                        style={{
                          background: 'var(--g-light)',
                          border: `2px dashed ${dragOver ? 'var(--g2)' : 'var(--g-mid)'}`,
                          borderRadius: 'var(--r-lg)', padding: '44px 20px',
                          textAlign: 'center', marginBottom: 16, cursor: 'pointer', transition: 'all .2s',
                        }}>
                        {scanning
                          ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                              <div style={{ width: 44, height: 44, border: '3px solid var(--g2)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                              <div>
                                <div style={{ fontSize: 14, color: 'var(--g-text)', fontWeight: 700, fontFamily: 'var(--font)' }}>Analyzing image…</div>
                                <div style={{ fontSize: 12, color: 'var(--ink-5)', marginTop: 4 }}>AI is identifying food items</div>
                              </div>
                            </div>
                          : <>
                              <div style={{ fontSize: 40, marginBottom: 10, lineHeight: 1 }}>📸</div>
                              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--g-text)', fontFamily: 'var(--font)', marginBottom: 4 }}>Scan Food</div>
                              <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>Take a photo to analyze</div>
                            </>
                        }
                      </div>
                      {!scanning && (
                        <button className="btn btn-prim" style={{ width: '100%', justifyContent: 'center', padding: '11px' }} onClick={fakeScan} disabled={!canScan}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
                          </svg>
                          Simulate AI Scan
                        </button>
                      )}
                    </>
                  ) : !editingScan ? (
                    <div>
                      <div style={{
                        background: 'linear-gradient(135deg, #9ca3af, #6b7280)',
                        borderRadius: 'var(--r-lg)',
                        padding: '16px 20px',
                        marginBottom: 18,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        color: 'white',
                      }}>
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font)' }}>{scanResult.name}</div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>
                            AI Scanned · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {scanResult.confidence != null && (
                            <div style={{
                              background: 'rgba(255,255,255,0.15)',
                              borderRadius: 'var(--r-md)',
                              padding: '6px 12px',
                              textAlign: 'center',
                              minWidth: 60,
                            }}>
                              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginBottom: 2 }}>confidence</div>
                              <div style={{ fontSize: 18, fontWeight: 700 }}>{scanResult.confidence}%</div>
                            </div>
                          )}
                          <button
                            onClick={() => setEditingScan(true)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: 6,
                              color: 'white', fontWeight: 600, fontSize: 13,
                              padding: '6px 12px', borderRadius: 'var(--r-sm)', transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Edit
                          </button>
                        </div>
                      </div>

                      {scanResult.confidence != null && (() => {
                        const meta = getConfidenceMeta(scanResult.confidence);
                        return (
                          <div style={{ marginBottom: 18 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <span style={{ fontSize: 12, color: 'var(--ink-5)' }}>AI confidence</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: meta.color }}>{meta.label}</span>
                            </div>
                            <div style={{ height: 6, background: 'var(--ink-8)', borderRadius: 'var(--r-sm)', overflow: 'hidden' }}>
                              <div style={{ width: `${scanResult.confidence}%`, height: '100%', background: meta.bar, transition: 'width 0.4s ease', borderRadius: 'var(--r-sm)' }} />
                            </div>
                          </div>
                        );
                      })()}

                      <div style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 14, fontFamily: 'var(--font)' }}>Macronutrients</h3>
                        {[
                          { label: 'Protein',  val: `${scanResult.p}g`        },
                          { label: 'Carbs',    val: `${scanResult.c}g`        },
                          { label: 'Fats',     val: `${scanResult.f}g`        },
                          { label: 'Calories', val: `${scanResult.kcal} kcal` },
                        ].map(item => (
                          <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--ink-8)' }}>
                            <div style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 500 }}>{item.label}</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-2)', fontFamily: 'var(--font)' }}>{item.val}</div>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-prim" style={{ flex: 1, justifyContent: 'center', padding: '12px' }} onClick={addScanResult}>
                          Add to {addTo}
                        </button>
                        <button className="btn btn-sec" style={{ justifyContent: 'center', padding: '12px 16px' }} onClick={fakeScan}>
                          Rescan
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ background: 'var(--ink-9)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 18, marginBottom: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 12, fontFamily: 'var(--font)' }}>
                          Edit Details
                        </div>
                        <div className="fg" style={{ marginBottom: 12 }}>
                          <label className="inp-label">Food Name</label>
                          <input className="inp" value={scanEdit.name || ''} onChange={e => setScanEdit(prev => ({ ...prev, name: e.target.value }))} minLength={1} maxLength={100} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
                          {[
                            { key: 'p',    label: 'Protein'  },
                            { key: 'c',    label: 'Carbs'    },
                            { key: 'f',    label: 'Fats'     },
                            { key: 'kcal', label: 'Calories' },
                          ].map(item => (
                            <div key={item.key} className="fg" style={{ margin: 0 }}>
                              <label className="inp-label" style={{ fontSize: 10 }}>{item.label}</label>
                              <input className="inp" type="number" value={scanEdit[item.key] || ''} onChange={e => setScanEdit(prev => ({ ...prev, [item.key]: e.target.value }))} min="0" max="10000" style={{ textAlign: 'center' }} />
                            </div>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-prim" style={{ flex: 1, justifyContent: 'center' }} onClick={applyScanEdit}>Save Changes</button>
                          <button className="btn btn-sec" onClick={() => setEditingScan(false)}>Cancel</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Search panel ── */}
              {modal === 'search' && (
                <div>
                  <div className="fg">
                    <input className="inp" placeholder="Search foods…" value={q} onChange={e => setQ(e.target.value)} autoFocus />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-5)', marginBottom: 10 }}>{filtered.length} results</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
                    {filtered.map((f, i) => (
                      <div
                        key={i}
                        onClick={() => addFromDB(f)}
                        style={{ padding: 12, borderRadius: 'var(--r-md)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s ease', background: 'var(--ink-9)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ink-8)'; e.currentTarget.style.borderColor = 'var(--g-mid)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--ink-9)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', fontFamily: 'var(--font)' }}>{f.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-5)', marginTop: 3 }}>P {f.p}g · C {f.c}g · F {f.f}g</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--g1)', fontFamily: 'var(--font)' }}>{f.kcal}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Manual panel ── */}
              {modal === 'manual' && (
                <div>
                  <div className="fg">
                    <label className="inp-label">Food Name</label>
                    <input className="inp" placeholder="e.g. Homemade pasta" value={manual.name} onChange={e => setManual(m => ({ ...m, name: e.target.value }))} maxLength={100} />
                  </div>
                  <div className="fg3" style={{ marginBottom: 14 }}>
                    {[
                      { key: 'kcal', label: 'Calories (kcal)' },
                      { key: 'p',    label: 'Protein (g)'     },
                      { key: 'c',    label: 'Carbs (g)'       },
                      { key: 'f',    label: 'Fat (g)'         },
                    ].map(item => (
                      <div key={item.key}>
                        <label className="inp-label">{item.label}</label>
                        <input className="inp" type="number" placeholder="0" value={manual[item.key]} onChange={e => setManual(m => ({ ...m, [item.key]: e.target.value }))} min="0" max="10000" />
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-prim" style={{ width: '100%', justifyContent: 'center' }} onClick={addManual}>
                    Add to {addTo}
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}