import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/layout/Toast';
import { subscriptionsApi } from '../../services/api';

const PLAN_ICONS = ['🌙', '⭐', '🚀', '🥗', '💪', '✨'];

const TABLE_ROWS = [
  { feature: 'AI Meal Scans',              free: '3/day',  premium: 'Unlimited' },
  { feature: 'Personalized Meal Plans',    free: '✗',      premium: '✓' },
  { feature: 'Nutritionist Consultations', free: '✗',      premium: '4/week' },
  { feature: 'Direct Messaging',           free: '✗',      premium: '✓' },
  { feature: 'Progress Reports',           free: 'Basic',  premium: 'Advanced' },
];


export default function Subscribe() {
  const { user, subscribe, unsubscribe } = useAuth();
  const navigate  = useNavigate();
  const toast     = useToast();
  const [searchParams] = useSearchParams();

  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [processing,    setProcessing]    = useState(null);    // plan.id while subscribing
  const [cancelConfirm, setCancelConfirm] = useState(false);   // false | true | 'processing' | 'success'

  useEffect(() => {
    subscriptionsApi.listPlans()
      .then((data) => setPlans(Array.isArray(data) ? data : []))
      .catch(() => setPlans([]))
      .finally(() => setPlansLoading(false));
  }, []);

  const selectedPlanId = searchParams.get('planId') || localStorage.getItem('pendingSubscriptionPlanId');
  const highlightedPlanId = selectedPlanId ? String(selectedPlanId) : null;
  const activePlan = useMemo(
    () => plans.find((plan) => plan.name === user?.planName) || null,
    [plans, user?.planName]
  );

  const formatPlanPeriod = (durationDays) => {
    if (!durationDays || durationDays >= 3650) return '';
    if (durationDays === 30) return 'month';
    if (durationDays === 90) return '3 months';
    if (durationDays === 365) return 'year';
    return `${durationDays} days`;
  };

  // ── Subscribe to a plan (calls real backend) ───────────────────────────────
  const handleSubscribe = async (plan) => {
    if (!plan.is_featured) return;
    setProcessing(plan.id);
    try {
      await subscribe({ planId: plan.id });   // AuthContext → subscriptionsApi.subscribe()
      localStorage.removeItem('pendingSubscriptionPlanId');
      toast({
        message:  `You're now on the ${plan.name} Plan! Premium features unlocked.`,
        type:     'success',
        duration: 5000,
      });
      navigate('/nutritionists?from=subscription');
    } catch (err) {
      toast({
        message: err.message || 'Subscription failed. Please try again.',
        type:    'error',
      });
    } finally {
      setProcessing(null);
    }
  };

  // ── Cancel subscription (calls real backend) ───────────────────────────────
  const handleCancel = async () => {
    setCancelConfirm('processing');
    try {
      const response = await unsubscribe();  // AuthContext → subscriptionsApi.unsubscribe()

      setCancelConfirm('success');

      // Format the end date for the toast if available
      const endDateStr = response?.endDate
        ? new Date(response.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'your billing period end';

      toast({
        message:  `Subscription cancelled. Access continues until ${endDateStr}.`,
        type:     'info',
      });

      // Brief pause so user sees the success tick, then reset
      setTimeout(() => setCancelConfirm(false), 2000);

    } catch (err) {
      toast({
        message: err.message || 'Cancellation failed. Please try again.',
        type:    'error',
      });
      setCancelConfirm(true);  // reset back to confirm buttons so they can retry
    }
  };

  // ── Format subscription end date for display ───────────────────────────────
  const formatEndDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  /* ── Active subscriber view ─────────────────────────────────────────────── */
  if (user.planName === 'Pro' && user.subscriptionStatus === 'active') {
    const endDate = formatEndDate(user.subscriptionEndDate);

    return (
      <div style={{ width: '100%', maxWidth: 1100, margin: '0 auto', padding: '0 16px' }}>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20, marginBottom: 24 }}>

          {/* Current Plan Card */}
          <div style={{
            background:    'var(--surf)',
            borderRadius:  'var(--r-xl)',
            padding:       24,
            border:        '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, opacity: .65, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>Current Plan</div>
                <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.5px' }}>NutriLens {user.planName}</div>
                <div style={{ fontSize: 13, opacity: .8, marginTop: 4 }}>
                  {user.planName || 'Pro'} · {user.subscriptionDaysRemaining} days remaining
                </div>
              </div>
              <div style={{
                background:  'rgba(16, 185, 129, 0.15)',
                color:       '#10b981',
                padding:     '6px 16px',
                borderRadius:'999px',
                fontSize:    11,
                fontWeight:  700,
                border:      '1px solid rgba(16, 185, 129, 0.3)',
              }}>
                ✓ ACTIVE
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Plan',       val: user.planName || 'Pro' },
                { label: 'Expires',    val: endDate },
                { label: 'Status',     val: user.subscriptionStatus || 'Active' },
              ].map(s => (
                <div key={s.label} style={{ background: 'rgba(255,255,255,.1)', borderRadius: 'var(--r-md)', padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, opacity: .6, textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 3 }}>{s.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{s.val}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
             
              <button
                style={{ padding: '11px 20px', background: 'rgba(255,255,255,.15)', color: 'white', border: '1px solid rgba(255,255,255,.3)', borderRadius: 'var(--r)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                onClick={() => toast({ message: 'Billing portal coming soon.', type: 'info' })}
              >
                Manage
              </button>
            </div>
          </div>

          {/* What's Included */}
          <div style={{ background: 'var(--surf)', borderRadius: 'var(--r-xl)', padding: 24, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 16 }}>What's Included</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {((activePlan?.features?.length ? activePlan.features : ['Unlimited AI meal scans', 'Personalized meal plans', 'Progress tracking & reports'])).map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: 'var(--ink-3)' }}>
                  <div style={{ width: 20, height: 20, background: 'var(--g-light)', border: '1px solid var(--g-mid)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--g2)" strokeWidth="2.5" strokeLinecap="round" style={{ width: 11, height: 11 }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cancel Zone */}
        <div style={{ background: 'var(--surf)', borderRadius: 'var(--r-xl)', padding: 24, border: '1px solid var(--border)' }}>
          {/* Cancel Zone */}
          <div style={{ marginTop: 28, padding: '18px 22px', background: 'var(--red-bg)', border: '1px solid #fecaca', borderRadius: 'var(--r)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#991b1b' }}>Cancel subscription</div>
              <div style={{ fontSize: 12.5, color: '#b91c1c', marginTop: 4 }}>
                You'll retain full access until {endDate}
              </div>
            </div>

            {!cancelConfirm ? (
              <button className="btn btn-red btn-sm" onClick={() => setCancelConfirm(true)}>
                Cancel Plan
              </button>

            ) : cancelConfirm === 'processing' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#991b1b' }}>
                <div style={{ width: 16, height: 16, border: '2px solid #991b1b', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                Cancelling…
              </div>

            ) : cancelConfirm === 'success' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#16a34a' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" style={{ width: 18, height: 18 }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span style={{ fontWeight: 600 }}>Cancelled successfully</span>
              </div>

            ) : (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ color: '#991b1b', fontWeight: 600 }}>Are you sure?</span>
                <button className="btn btn-red btn-sm" onClick={handleCancel}>Yes, cancel</button>
                <button className="btn btn-sec btn-sm" onClick={() => setCancelConfirm(false)}>Keep plan</button>
              </div>
            )}
          </div>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ── Free user view ──────────────────────────────────────────────────────── */
  return (
    <div style={{ width: '100%', maxWidth: 1100, margin: '0 auto', padding: '0 16px' }}>

      {/* Plan Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 24, marginBottom: 48 }}>
        {plans.map((plan, idx) => (
          <div key={plan.id} style={{
            background:   'var(--surf)',
            border:       `2px solid ${String(plan.id) === highlightedPlanId ? 'var(--g2)' : plan.is_featured ? 'var(--g2)' : 'var(--border)'}`,
            borderRadius: 'var(--r-xl)',
            overflow:     'hidden',
            transform:    plan.is_featured ? 'scale(1.03)' : 'none',
            boxShadow:    plan.is_featured ? 'var(--sh-lg)' : 'var(--sh-xs)',
          }}>
            {plan.is_featured && (
              <div style={{ background: 'linear-gradient(135deg,var(--g1),var(--g2))', color: 'white', textAlign: 'center', fontSize: 11, fontWeight: 800, padding: '7px 0', letterSpacing: 1 }}>
                MOST POPULAR
              </div>
            )}
            <div style={{ padding: '28px 22px' }}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 42, marginBottom: 12 }}>{PLAN_ICONS[idx % PLAN_ICONS.length]}</div>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{plan.name}</div>
                <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-1px', margin: '10px 0 6px' }}>
                  ${plan.price}{formatPlanPeriod(plan.duration_days) && <span style={{ fontSize: 14, fontWeight: 500, opacity: .75 }}>/{formatPlanPeriod(plan.duration_days)}</span>}
                </div>
                {String(plan.id) === highlightedPlanId && <span className="badge badge-green" style={{ marginTop: 8 }}>Selected from homepage</span>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                {(plan.features || []).map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, color: 'var(--ink-3)' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--g2)" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {f}
                  </div>
                ))}
              </div>

              <button
                className={`btn ${plan.is_featured ? 'btn-prim' : 'btn-sec'}`}
                style={{ width: '100%', padding: '13px', fontSize: 15, fontWeight: 700 }}
                onClick={() => handleSubscribe(plan)}
                disabled={!plan.is_featured || !!processing}
              >
                {processing === plan.id ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <div style={{ width: 16, height: 16, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                    Processing…
                  </span>
                ) : plan.is_featured ? 'Upgrade to Pro' : 'Your current plan'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {!plansLoading && plans.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 24, marginBottom: 24, color: 'var(--ink-5)' }}>
          No subscription plans are available right now.
        </div>
      )}

      {plansLoading && (
        <div className="card" style={{ textAlign: 'center', padding: 24, marginBottom: 24, color: 'var(--ink-5)' }}>
          Loading plans...
        </div>
      )}

      {/* Feature Comparison Table */}
      <div style={{ background: 'var(--surf)', borderRadius: 'var(--r-xl)', padding: 24, border: '1px solid var(--border)', marginBottom: 32 }}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>Free vs Pro</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Feature</th>
                <th style={{ textAlign: 'center' }}>Free</th>
                <th style={{ textAlign: 'center', color: 'var(--g2)' }}>Pro</th>
              </tr>
            </thead>
            <tbody>
              {TABLE_ROWS.map((row, i) => (
                <tr key={i}>
                  <td>{row.feature}</td>
                  <td style={{ textAlign: 'center', color: row.free === '✗' ? '#ef4444' : 'var(--ink-3)' }}>{row.free}</td>
                  <td style={{ textAlign: 'center', color: '#10b981', fontWeight: 600 }}>{row.premium}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}