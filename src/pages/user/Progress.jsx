import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/layout/Toast';
import { profileApi, mealsApi, patientsApi } from '../../services/api';
import { useModalA11y } from '../../hooks/useModalA11y';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell,
} from 'recharts';

function normalizeListPayload(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function formatDateLabel(dateLike) {
  if (!dateLike) return '—';
  const parsed = new Date(dateLike);
  return Number.isNaN(parsed.getTime())
    ? '—'
    : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function normalizeDateKey(dateLike) {
  if (!dateLike) return null;
  const raw = String(dateLike);
  if (raw.length >= 10 && raw.includes('-')) return raw.slice(0, 10);
  const parsed = new Date(dateLike);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function WeightTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface, #fff)', border: '1px solid var(--border, #e5e7eb)',
      borderRadius: 10, padding: '10px 14px', fontSize: 12,
      boxShadow: '0 4px 16px rgba(0,0,0,.10)', fontFamily: 'var(--font)',
    }}>
      <div style={{ fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <strong style={{ color: 'var(--ink-2)' }}>{p.value} kg</strong>
        </div>
      ))}
    </div>
  );
}

function CalTooltip({ active, payload, label, calorieGoal = 2000 }) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  if (!val) return null;
  const over = val > calorieGoal;
  return (
    <div style={{
      background: 'var(--surface, #fff)', border: '1px solid var(--border, #e5e7eb)',
      borderRadius: 10, padding: '10px 14px', fontSize: 12,
      boxShadow: '0 4px 16px rgba(0,0,0,.10)', fontFamily: 'var(--font)',
    }}>
      <div style={{ fontWeight: 700, color: 'var(--ink-2)', marginBottom: 4 }}>{label}</div>
      <div style={{ color: over ? 'rgba(239,68,68,.9)' : 'rgba(34,160,90,.9)', fontWeight: 700 }}>
        {val.toLocaleString()} kcal
      </div>
      <div style={{ color: 'var(--ink-5)', marginTop: 2 }}>
        Target: {calorieGoal} kcal &nbsp;
        <span style={{ color: over ? 'rgba(239,68,68,.9)' : 'rgba(34,160,90,.9)', fontWeight: 600 }}>
          ({over ? '+' : ''}{val - calorieGoal} kcal)
        </span>
      </div>
    </div>
  );
}

export default function Progress() {
  const { user, updateWeight } = useAuth();
  const navigate  = useNavigate();
  const toast     = useToast();
  const isPremium = user?.isSubscribed;

  // ── State ─────────────────────────────────────────────────────────────────
  const [profileData,    setProfileData]    = useState(null);
  const [weightHistory,  setWeightHistory]  = useState([]);
  const [measurements,   setMeasurements]   = useState([]);
  const [calorieData,    setCalorieData]    = useState([]);
  const [calorieGoal,    setCalorieGoal]    = useState(2000);
  const [feedback,       setFeedback]       = useState([]);
  const [isLoading,      setIsLoading]      = useState(true);
  const [isSaving,       setIsSaving]       = useState(false);
  const [updateModal,    setUpdateModal]    = useState(false);
  const [chartReady,     setChartReady]     = useState(false);
  const [form, setForm] = useState({ weight: '', waist: '', hips: '', chest: '', arms: '' });

  const closeUpdateModal = useCallback(() => setUpdateModal(false), []);
  const updateModalRef   = useModalA11y(isPremium && updateModal, closeUpdateModal);

  // Delay chart render by one tick so containers have computed dimensions
  useEffect(() => {
    const t = setTimeout(() => setChartReady(true), 50);
    return () => clearTimeout(t);
  }, []);

  // ── Load data on mount ────────────────────────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      try {
        const [profile, weights] = await Promise.all([
          profileApi.getProfile(),
          profileApi.getWeightHistory(),
        ]);
        setProfileData(profile);
        // FIX: sort newest-first so weightHistory[0] is always the latest entry
        const sorted = normalizeListPayload(weights).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
        setWeightHistory(sorted);
        setCalorieGoal(profile?.daily_calorie_goal || 2000);
        // FIX: seed form weight from the most recent weight entry, not profile snapshot
        setForm(f => ({ ...f, weight: sorted[0]?.weight_kg ?? profile?.current_weight_kg ?? '' }));

        // FIX: calorie history — gracefully swallow 500 and keep chart empty-state
        try {
          const historyData = await mealsApi.getHistory(7);
          // Normalise: backend may return {date, total_calories} or {date, calories}
          // We always produce { label, calories }
          const perDay = new Map();
          normalizeListPayload(historyData).forEach((d) => {
            const dateKey = normalizeDateKey(d?.date || d?.logged_at || d?.day);
            if (!dateKey) return;
            const entryCalories = Number(d?.calories ?? d?.total_calories ?? 0) || 0;
            perDay.set(dateKey, (perDay.get(dateKey) || 0) + entryCalories);
          });
          const normalised = Array.from(perDay.entries())
            .sort(([a], [b]) => new Date(a) - new Date(b))
            .map(([dateKey, calories]) => ({
              label: formatDateLabel(dateKey),
              calories,
            }));
          setCalorieData(normalised);
        } catch (err) {
          // 500 from backend — show empty chart, don't crash the page
          console.error('Failed to load calorie data:', err);
          setCalorieData([]);
        }

        if (isPremium) {
          const [meas, nutritionistFeedback] = await Promise.all([
            profileApi.getMeasurements(),
            patientsApi.getFeedback().catch(() => []),
          ]);
          // FIX: sort measurements newest-first (some backends return oldest-first)
          const sortedMeas = normalizeListPayload(meas).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
          setMeasurements(sortedMeas);
          const feedbackList = normalizeListPayload(nutritionistFeedback);
          setFeedback(feedbackList);

          // Mark unread feedback as read after loading so the patient inbox stays in sync.
          const unread = feedbackList.filter((item) => item?.id && !item?.is_read);
          if (unread.length > 0) {
            Promise.allSettled(unread.map((item) => patientsApi.markFeedbackAsRead(item.id)));
          }
          if (sortedMeas.length > 0) {
            const latest = sortedMeas[0];
            setForm(f => ({
              ...f,
              waist: latest.waist_cm ?? '',
              hips:  latest.hips_cm  ?? '',
              chest: latest.chest_cm ?? '',
              arms:  latest.arms_cm  ?? '',
            }));
          }
        }
      } catch (err) {
        toast({ message: 'Failed to load progress data', type: 'error' });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [isPremium, toast]);

  // ── Derived values ────────────────────────────────────────────────────────
  // weightHistory is sorted newest-first, so [0] = latest, [last] = earliest
  const latestWeightEntry   = weightHistory[0];
  const earliestWeightEntry = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1] : null;
  const currentWeight = latestWeightEntry?.weight_kg   ?? profileData?.current_weight_kg ?? user?.stats?.currentWeight ?? 0;
  const startWeight   = earliestWeightEntry?.weight_kg ?? profileData?.start_weight_kg   ?? user?.stats?.startWeight   ?? 0;
  const goalWeight    = profileData?.goal_weight_kg    ?? user?.stats?.goalWeight         ?? 0;
  const lost          = Math.max(0, startWeight - currentWeight).toFixed(1);

  // ── Weight chart — oldest→newest left→right, all entries ──────────────
  // weightHistory is newest-first, so reverse gives oldest-first
  // Show all entries (not just last 7) to track full history
  const weightChartData = [...weightHistory]
    .reverse()          // oldest-first
    .map(entry => ({
      label:  formatDateLabel(entry?.date),
      actual: entry.weight_kg,
    }))
    .filter(entry => entry.label !== '—');

  // ── Measurement display (latest vs previous for delta) ────────────────────
  const getDelta = (newVal, oldVal, unit) => {
    const diff = parseFloat(newVal) - parseFloat(oldVal);
    if (!diff || isNaN(diff)) return 'No change';
    const sign = diff > 0 ? '↑' : '↓';
    return `${sign} ${Math.abs(diff).toFixed(1)}${unit}`;
  };

  const latestMeas = measurements[0];
  const prevMeas   = measurements[1];
  const measurementDisplay = latestMeas ? [
    { label: 'Waist', field: 'waist_cm', val: latestMeas.waist_cm },
    { label: 'Hips',  field: 'hips_cm',  val: latestMeas.hips_cm  },
    { label: 'Chest', field: 'chest_cm', val: latestMeas.chest_cm },
    { label: 'Arms',  field: 'arms_cm',  val: latestMeas.arms_cm  },
  ].map(m => ({
    label: m.label,
    val:   m.val != null ? String(m.val) : '—',
    unit:  'cm',
    delta: prevMeas?.[m.field] != null && m.val != null
      ? getDelta(m.val, prevMeas[m.field], 'cm')
      : '—',
  })) : [];

  // ── Save progress ─────────────────────────────────────────────────────────
  const handleUpdate = async () => {
    const w = parseFloat(form.weight);
    if (isNaN(w) || w < 20 || w > 300) {
      toast({ message: 'Enter a valid weight between 20 and 300 kg.', type: 'warning' });
      return;
    }

    setIsSaving(true);
    const today = new Date().toISOString().split('T')[0];

    try {
      // Log weight — PATCH if today's entry already exists, else POST
      const existing = weightHistory.find(e => normalizeDateKey(e.date) === today);
      if (existing) {
        await profileApi.updateWeight(existing.id, { weight_kg: w });
      } else {
        await profileApi.logWeight({ date: today, weight_kg: w });
      }
      updateWeight(w);

      // Log measurements (premium only, only fields that are filled)
      // Use same upsert pattern as weights: check if exists for today, then update or create
      if (isPremium) {
        const measPayload = { date: today };
        if (form.waist) measPayload.waist_cm = parseFloat(form.waist);
        if (form.hips)  measPayload.hips_cm  = parseFloat(form.hips);
        if (form.chest) measPayload.chest_cm = parseFloat(form.chest);
        if (form.arms)  measPayload.arms_cm  = parseFloat(form.arms);

        const hasAny = Object.keys(measPayload).length > 1;
        if (hasAny) {
          try {
            // Check if measurement for today exists in the measurements array
            const existingMeas = measurements.find(m => normalizeDateKey(m.date) === today);
            if (existingMeas) {
              // Update existing measurement for today
              await profileApi.updateMeasurement(existingMeas.id, measPayload);
            } else {
              // Create new measurement for today
              await profileApi.logMeasurement(measPayload);
            }
          } catch (measErr) {
            // surface measurement-specific error clearly
            toast({ message: `Measurements not saved: ${measErr.message || 'server error'}`, type: 'error' });
          }
        }
      }

      // Refresh all data after save
      const [profile, weights] = await Promise.all([
        profileApi.getProfile(),
        profileApi.getWeightHistory(),
      ]);
      setProfileData(profile);
      const sorted = normalizeListPayload(weights).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
      setWeightHistory(sorted);

      if (isPremium) {
        const meas = await profileApi.getMeasurements();
        const sortedMeas = normalizeListPayload(meas).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
        setMeasurements(sortedMeas);
        // Update form with freshly saved values
        if (sortedMeas.length > 0) {
          const latest = sortedMeas[0];
          setForm(f => ({
            ...f,
            weight: sorted[0]?.weight_kg ?? profile?.current_weight_kg ?? f.weight,
            waist:  latest.waist_cm ?? '',
            hips:   latest.hips_cm  ?? '',
            chest:  latest.chest_cm ?? '',
            arms:   latest.arms_cm  ?? '',
          }));
        }
      }

      toast({ message: 'Progress updated successfully! Great work 💪', type: 'success' });
      setUpdateModal(false);
    } catch (err) {
      toast({ message: err.message || 'Failed to save progress', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return (
    <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>Loading progress...</div>
  );

  return (
    <div>
      {/* Stat cards */}
      <div className="prog-stat-row">
        <div className="prog-stat">
          <div className="stat-lbl">Starting Weight</div>
          <div className="stat-val">{startWeight || '—'} <span className="stat-unit">{startWeight ? 'kg' : ''}</span></div>
          <div className="stat-note">First logged entry</div>
        </div>
        <div className="prog-stat">
          <div className="stat-lbl">Current Weight</div>
          <div className="stat-val">{currentWeight || '—'} <span className="stat-unit">{currentWeight ? 'kg' : ''}</span></div>
          <div className="stat-note good">{startWeight && currentWeight ? `↓ ${lost} kg lost` : 'No weight logged yet'}</div>
        </div>
        <div className="prog-stat">
          <div className="stat-lbl">Goal Weight</div>
          <div className="stat-val">{goalWeight || '—'} <span className="stat-unit">{goalWeight ? 'kg' : ''}</span></div>
          <div className="stat-note">
            {!goalWeight ? 'Not set' : currentWeight <= goalWeight ? 'Goal reached! 🎉' : `${(currentWeight - goalWeight).toFixed(1)} kg to go`}
          </div>
        </div>
        <div className="prog-stat">
          <div className="stat-lbl">Avg Calories</div>
          <div className="stat-val">
            {calorieData.length > 0
              ? Math.round(calorieData.reduce((sum, d) => sum + (d.calories || 0), 0) / calorieData.length).toLocaleString()
              : '—'}
            <span className="stat-unit">{calorieData.length > 0 ? 'kcal' : ''}</span>
          </div>
          <div className="stat-note good">
            {calorieData.length > 0
              ? (Math.round(calorieData.reduce((sum, d) => sum + (d.calories || 0), 0) / calorieData.length) <= calorieGoal
                  ? 'Within target'
                  : 'Above target')
              : 'No data yet'}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="g2" style={{ marginBottom: 24 }}>

        {/* Weight Chart */}
        <div className="card" style={{ minWidth: 0 }}>
          <div className="card-title">Weight Progress</div>
          {weightChartData.length < 2 ? (
            <div style={{ height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-5)', fontSize: 13 }}>
              {weightChartData.length === 0
                ? 'No weight entries yet. Log your first weigh-in!'
                : 'Log at least 2 entries to see your chart.'}
            </div>
          ) : chartReady ? (
            <div style={{ height: 170, marginTop: 8, minHeight: 170, minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e5e7eb)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--ink-5, #9ca3af)', fontFamily: 'var(--font)' }} axisLine={false} tickLine={false} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: 'var(--ink-5, #9ca3af)', fontFamily: 'var(--font)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<WeightTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '4 3' }} />
                  <Line
                    type="monotone" dataKey="actual"
                    stroke="var(--g2, #22a05a)" strokeWidth={2.4}
                    dot={{ r: 4, fill: 'var(--g2, #22a05a)', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: 'var(--g2, #22a05a)', stroke: '#fff', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : null}
          <div style={{ display: 'flex', gap: 16, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--ink-5)' }}>Start <strong style={{ color: 'var(--ink-2)' }}>{startWeight || '—'} {startWeight ? 'kg' : ''}</strong></div>
            <div style={{ fontSize: 11, color: 'var(--ink-5)' }}>Now <strong style={{ color: 'var(--g2)' }}>{currentWeight || '—'} {currentWeight ? 'kg' : ''}</strong></div>
            <div style={{ fontSize: 11, color: 'var(--ink-5)' }}>Goal <strong style={{ color: 'var(--ink-2)' }}>{goalWeight || '—'} {goalWeight ? 'kg' : ''}</strong></div>
            {parseFloat(lost) > 0 && <div style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: 'var(--g1)' }}>−{lost} kg lost 🎉</div>}
          </div>
        </div>

        {/* Calorie Chart */}
        <div className="card" style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div className="card-title">Daily Calorie Intake</div>
            <span style={{ fontSize: 11, color: 'var(--ink-5)' }}>Target: {calorieGoal} kcal</span>
          </div>
          {/* FIX: guard empty state so ResponsiveContainer never mounts into a zero-size div */}
          {calorieData.length === 0 ? (
            <div style={{ height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-5)', fontSize: 13 }}>
              No calorie data yet — start logging meals to see your chart.
            </div>
          ) : chartReady ? (
            <div style={{ height: 170, minHeight: 170, minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={calorieData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e5e7eb)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--ink-5, #9ca3af)', fontFamily: 'var(--font)' }} axisLine={false} tickLine={false} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: 'var(--ink-5, #9ca3af)', fontFamily: 'var(--font)' }} axisLine={false} tickLine={false} />
                  <ReferenceLine y={calorieGoal} stroke="var(--red, #ef4444)" strokeDasharray="4 3" strokeOpacity={0.6} strokeWidth={1} />
                  <Tooltip content={<CalTooltip calorieGoal={calorieGoal} />} cursor={{ fill: 'var(--border, #e5e7eb)', opacity: 0.4 }} />
                  <Bar dataKey="calories" radius={[4, 4, 0, 0]}>
                    {calorieData.map((entry, i) => (
                      <Cell key={i} fill={
                        !entry.calories
                          ? 'var(--ink-7, #f3f4f6)'
                          : entry.calories > calorieGoal
                            ? 'rgba(239,68,68,.7)'
                            : 'rgba(34,160,90,.75)'
                      } />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </div>
      </div>

      {/* Unified Advanced Insights Section (Body Measurements & Feedback) */}
      <div style={{ position: 'relative', marginBottom: 24, borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
        
        {/* Content Container (Blurred for free users) */}
        <div className="g2" style={{ 
          filter: isPremium ? 'none' : 'blur(10px)', 
          pointerEvents: isPremium ? 'auto' : 'none',
          userSelect: isPremium ? 'auto' : 'none',
          transition: 'filter 0.4s ease'
        }}>
          
          {/* Body Measurements Card */}
          <div className="card" style={{ height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="card-title">Body Measurements</div>
              {isPremium && (
                <button type="button" className="btn btn-prim btn-xs" onClick={() => setUpdateModal(true)}>+ Update</button>
              )}
            </div>

            {isPremium ? (
              measurementDisplay.length === 0 ? (
                <div style={{ color: 'var(--ink-5)', fontSize: 13, padding: '12px 0' }}>
                  No measurements logged yet. Click "+ Update" to add your first entry.
                </div>
              ) : (
                measurementDisplay.map(m => (
                  <div className="mtag" key={m.label}>
                    <div className="mtag-l">{m.label}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="mtag-v">{m.val} {m.val !== '—' ? m.unit : ''}</div>
                      <div className="mtag-d">{m.delta}</div>
                    </div>
                  </div>
                ))
              )
            ) : (
              /* Mock data for blur effect */
              <>
                {[
                  { label: 'Waist', val: '78.5 cm', delta: '↓ 1.2cm' },
                  { label: 'Hips',  val: '94.2 cm', delta: '↓ 0.8cm' },
                  { label: 'Chest', val: '102.0 cm', delta: '—' },
                  { label: 'Arms',  val: '32.4 cm', delta: '↑ 0.5cm' }
                ].map(m => (
                  <div className="mtag" key={m.label}>
                    <div className="mtag-l">{m.label}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="mtag-v">{m.val}</div>
                      <div className="mtag-d">{m.delta}</div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* BMI (Premium or Mock) */}
            <div className="mtag" style={{ marginBottom: 0 }}>
              <div className="mtag-l">BMI</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="mtag-v">
                  {isPremium ? (currentWeight && profileData?.height_cm ? (currentWeight / ((profileData.height_cm / 100) ** 2)).toFixed(1) : '—') : '24.2'}
                </div>
                <span className="badge badge-amber" style={{ fontSize: 10 }}>
                  {isPremium ? (() => {
                    if (!currentWeight || !profileData?.height_cm) return '—';
                    const bmi = currentWeight / ((profileData.height_cm / 100) ** 2);
                    if (bmi < 18.5) return 'Underweight';
                    if (bmi < 25)   return 'Normal';
                    if (bmi < 30)   return 'Overweight';
                    return 'Obese';
                  })() : 'Normal'}
                </span>
              </div>
            </div>
          </div>

          {/* Nutritionist Feedback Card */}
          <div className="card" style={{ height: '100%' }}>
            <div className="card-title" style={{ marginBottom: 14 }}>Nutritionist Feedback</div>
            
            {isPremium ? (
              feedback.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--ink-5)', padding: '12px 0' }}>
                  No feedback yet. Your nutritionist notes will appear here.
                </div>
              ) : (
                feedback.map((f) => (
                  <div key={f.id || f.created_at} className="tl">
                    <div className="tl-dot">{f.icon || '💬'}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', fontFamily: 'var(--font)' }}>
                        {f.created_at ? new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'} · {f.nutritionist_username || 'Nutritionist'}
                      </div>
                      {f.title ? (
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginTop: 6 }}>
                          {f.title}
                        </div>
                      ) : null}
                      <div style={{ fontSize: 13, color: 'var(--ink-4)', marginTop: 4, lineHeight: 1.6 }}>{f.message || 'No message provided.'}</div>
                    </div>
                  </div>
                ))
              )
            ) : (
              /* Mock data for feedback */
              <>
                <div className="tl">
                  <div className="tl-dot">🥗</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>Apr 25, 2026 · Dr. Sarah</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginTop: 6 }}>Protein Intake</div>
                    <div style={{ fontSize: 13, color: 'var(--ink-4)', marginTop: 4 }}>Great job reaching your protein targets this week...</div>
                  </div>
                </div>
                <div className="tl">
                  <div className="tl-dot">💧</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>Apr 22, 2026 · Dr. Sarah</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginTop: 6 }}>Hydration Levels</div>
                    <div style={{ fontSize: 13, color: 'var(--ink-4)', marginTop: 4 }}>You seem to be falling slightly short on water intake...</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Single Global Lock Overlay (Free users only) */}
        {!isPremium && (
          <div style={{
            position: 'absolute', inset: 0, 
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', zIndex: 10, padding: 32, textAlign: 'center',
            backdropFilter: 'blur(2px)'
          }}>
            <div style={{ 
              width: 64, height: 64, borderRadius: '50%', background: 'var(--g2)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              marginBottom: 16, boxShadow: '0 8px 24px rgba(34,160,90,0.4)' 
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff"><path d="M18 10h-1V7c0-2.76-2.24-5-5-5S7 4.24 7 7v3H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V12c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V7c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v3z"/></svg>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink-2)', marginBottom: 8, fontFamily: 'var(--font)' }}>Unlock Advanced Insights</div>
            <div style={{ fontSize: 14, color: 'var(--ink-3)', maxWidth: 320, marginBottom: 24, lineHeight: 1.5 }}>
              Upgrade to Premium to track body measurements, calculate BMI, and get direct feedback from our nutritionists.
            </div>
            <button type="button" onClick={() => navigate('/user/Subscribe')} className="btn btn-prim" style={{ padding: '12px 32px', fontSize: 15 }}>
              Upgrade to Premium →
            </button>
          </div>
        )}
      </div>

      {/* Update Progress Modal (Premium only) */}
      {isPremium && updateModal && (
        <div ref={updateModalRef} className="modal-bg open" onClick={e => { if (e.target === e.currentTarget) closeUpdateModal(); }}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="progress-update-title"
            style={{ width: 520, maxWidth: 'calc(100vw - 32px)' }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title" id="progress-update-title">📊 Update Progress</div>
              <button type="button" className="modal-close" onClick={closeUpdateModal} aria-label="Close">✕</button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ fontSize: 12, color: 'var(--ink-5)', marginBottom: 20 }}>
                Log your latest measurements to track your journey accurately.
              </div>

              <div style={{ marginBottom: 24 }}>
                <label className="inp-label">Current Weight (kg)</label>
                <input className="inp" type="number" step="0.1"
                  value={form.weight}
                  onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} />
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 12 }}>
                  Body Measurements (cm)
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {['waist', 'hips', 'chest', 'arms'].map(key => (
                    <div key={key}>
                      <label className="inp-label">{key.charAt(0).toUpperCase() + key.slice(1)}</label>
                      <input className="inp" type="number"
                        value={form[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-sec" onClick={closeUpdateModal}>Cancel</button>
                <button type="button" className="btn btn-prim" onClick={handleUpdate} disabled={isSaving}>
                  {isSaving ? 'Saving…' : 'Save Progress'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}