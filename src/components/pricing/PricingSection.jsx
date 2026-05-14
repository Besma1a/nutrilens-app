import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import FadeUp from '../../pages/public/FadeUp';
import { C } from '../../pages/public/constants/tokens';
import { subscriptionsApi } from '../../services/api';

const FEATURES = [
  { text: 'AI calorie scans',                                  free: '3 per day', pro: 'Unlimited' },
  { text: 'Browse nutritionists & public content',             free: true,        pro: true },
  { text: 'Progress tracking dashboard',                       free: true,        pro: true },
  { text: 'Online consultation with a nutritionist',           free: false,       pro: true, pro_label: '4/week' },
  { text: 'Personalized diet plan assigned by nutritionist',   free: false,       pro: true },
  { text: 'Diet plan updated based on consultation progress',  free: false,       pro: true },
  { text: 'Ongoing WhatsApp Mentorship',                       free: false,       pro: true },
];

// Shown when the API returns no plans (billing system not yet active)
const FALLBACK_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '0',
    tagline: 'Get started with essential tools',
    is_featured: false,
    featureKey: 'free',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '9.99',
    tagline: 'Full access to personalized nutrition care',
    is_featured: true,
    featureKey: 'pro',
  },
];

function Checkmark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke={C.tomato} strokeWidth="2.5" strokeLinecap="round"
      style={{ flexShrink: 0, marginTop: 1 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function Cross() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="rgba(43,87,38,0.2)" strokeWidth="2.5" strokeLinecap="round"
      style={{ flexShrink: 0, marginTop: 1 }}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function Pill({ text }) {
  return (
    <span style={{
      fontFamily: "'Inter', sans-serif",
      fontSize: 12,
      fontWeight: 700,
      color: C.tomato,
      background: 'rgba(165,12,5,0.08)',
      borderRadius: 999,
      padding: '2px 10px',
      flexShrink: 0,
      whiteSpace: 'nowrap',
    }}>
      {text}
    </span>
  );
}

function PlanCard({ plan, buttonText, onCta, hideButton }) {
  const featureKey = plan.featureKey || (plan.is_featured ? 'pro' : 'free');

  return (
    <div style={{
      background: C.bg,
      border: plan.is_featured ? `2px solid ${C.forest}` : `1px solid ${C.cream}`,
      borderRadius: 24,
      padding: '36px 28px',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      boxShadow: plan.is_featured ? '0 8px 32px rgba(43,87,38,0.13)' : 'none',
    }}>
      {plan.is_featured && (
        <div style={{
          position: 'absolute',
          top: -14,
          left: '50%',
          transform: 'translateX(-50%)',
          background: C.lime,
          color: C.forest,
          fontFamily: "'Inter', sans-serif",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          padding: '4px 16px',
          borderRadius: 999,
          whiteSpace: 'nowrap',
        }}>
          Most Popular
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <h3 style={{
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 800,
          fontSize: 22,
          color: C.forest,
          margin: '0 0 6px',
        }}>
          {plan.name}
        </h3>
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 14,
          color: '#6b7280',
          margin: '0 0 20px',
          lineHeight: 1.5,
        }}>
          {plan.tagline || plan.description || ''}
        </p>
        <div style={{
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 800,
          fontSize: 44,
          color: C.forest,
          letterSpacing: '-1px',
          lineHeight: 1,
        }}>
          ${plan.price}
          <span style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 400,
            fontSize: 15,
            color: '#6b7280',
            letterSpacing: 0,
          }}>
            /month
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28, flex: 1 }}>
        {FEATURES.map((f) => {
          const val = f[featureKey];
          return (
            <div key={f.text} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              {val === false ? <Cross /> : <Checkmark />}
              <span style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 14,
                color: val === false ? 'rgba(43,87,38,0.3)' : 'rgba(43,87,38,0.8)',
                lineHeight: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
              }}>
                {featureKey === 'pro' && val === 'Unlimited' ? 'Unlimited AI calorie scans' : f.text}
                {typeof val === 'string' && featureKey === 'free' && <Pill text={val} />}
                {featureKey === 'pro' && f.pro_label && <Pill text={f.pro_label} />}
              </span>
            </div>
          );
        })}
      </div>

      {!hideButton && (
        <button
          onClick={onCta}
          style={{
            background: plan.is_featured ? C.forest : 'transparent',
            color: plan.is_featured ? C.white : C.forest,
            border: plan.is_featured ? 'none' : `1.5px solid ${C.forest}`,
            borderRadius: 12,
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
            width: '100%',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          {buttonText}
        </button>
      )}
    </div>
  );
}

export default function PricingSection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    subscriptionsApi.listPlans()
      .then((data) => {
        if (!Array.isArray(data)) return setPlans([]);
        const TAGLINES = {
          free: 'Get started with essential tools',
          pro:  'Full access to personalized nutrition care',
        };
        const normalized = data.slice(0, 2).map((p) => {
          const key = p.name?.toLowerCase().includes('pro') ? 'pro' : 'free';
          return { ...p, featureKey: key, tagline: p.tagline || TAGLINES[key] || '' };
        });
        setPlans(normalized);
      })
      .catch(() => setPlans([]));
  }, []);

  const displayPlans = plans.length ? plans : FALLBACK_PLANS;

  const isPro = user?.planName === 'Pro' && user?.subscriptionStatus === 'active';

  const getButtonText = (plan) => {
    if (!user) return plan.is_featured ? 'Upgrade to Pro' : 'Start for free';
    if (isPro) return plan.is_featured ? 'Your current plan' : '';
    return plan.is_featured ? 'Upgrade to Pro' : 'Your current plan';
  };

  const handleCta = (plan) => {
    if (!user) {
      navigate('/register');
    } else if (plan.is_featured && !isPro) {
      navigate('/user/subscribe');
    }
  };

  return (
    <section style={{ background: C.white, padding: '80px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        <FadeUp>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span style={{
              display: 'inline-block',
              background: C.lime,
              color: C.forest,
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '4px 14px',
              borderRadius: 999,
              marginBottom: 16,
            }}>
              Pricing
            </span>
            <h2 style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 800,
              fontSize: 'clamp(28px, 4vw, 40px)',
              color: C.tomato,
              margin: '0 0 12px',
              letterSpacing: '-0.5px',
            }}>
              Choose your plan
            </h2>
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 16,
              color: 'rgba(43,87,38,0.7)',
              margin: 0,
              maxWidth: 480,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}>
              Start free. Upgrade when you're ready for personalized nutritionist support.
            </p>
          </div>
        </FadeUp>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
          gap: 28,
        }}>
          {displayPlans.map((plan, i) => (
            <FadeUp key={plan.id} delay={i * 0.1}>
              <PlanCard
                plan={plan}
                buttonText={getButtonText(plan)}
                onCta={() => handleCta(plan)}
                hideButton={isPro && !plan.is_featured}
              />
            </FadeUp>
          ))}
        </div>

      </div>
    </section>
  );
}
