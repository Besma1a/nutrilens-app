import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import FadeUp from '../../pages/public/FadeUp';
import { C } from '../../pages/public/constants/tokens';

const PLANS = [
  {
    id: 'monthly',
    icon: '🌙',
    name: 'Monthly',
    price: 29,
    period: 'month',
    features: ['Unlimited AI meal scans', 'Personalized meal plans', '2 consultations/month', 'Direct nutritionist messaging', 'Progress tracking & reports', 'Cancel anytime'],
    popular: false,
  },
  {
    id: 'quarterly',
    icon: '⭐',
    name: 'Quarterly',
    price: 69,
    period: '3 months',
    savings: 'Save $18',
    features: ['All Monthly features', '8 consultations total', 'Priority support', 'Seasonal meal plans', 'Recipe library access', '20% savings'],
    popular: true,
  },
  {
    id: 'annual',
    icon: '🚀',
    name: 'Annual',
    price: 199,
    period: 'year',
    savings: 'Save $149',
    monthlyEquivalent: '~$16.58/month',
    features: ['All Quarterly features', 'Unlimited consultations', 'Personal health coach', 'Custom meal planning', 'Premium analytics', 'Best value'],
    popular: false,
  },
];

export default function PricingSection() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getButtonText = () => {
    if (!user) return 'Get Started';
    if (user.isSubscribed) return 'Manage Plan';
    return 'Upgrade Now';
  };

  const handlePlanClick = (plan) => {
    if (!user) {
      navigate('/register');
    } else {
      navigate('/user/subscribe');
    }
  };

  return (
    <section style={{ background: 'linear-gradient(to bottom, #ffffff, #f8fafc)', padding: '80px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <FadeUp>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div
              style={{
                display: 'inline-block',
                background: C.lime,
                borderRadius: 999,
                padding: '4px 14px',
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 700,
                fontSize: 12,
                color: C.forest,
                letterSpacing: 2,
                textTransform: 'uppercase',
                marginBottom: 16,
              }}
            >
              Transparent Pricing
            </div>
            <h2
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 800,
                fontSize: 'clamp(28px, 4vw, 44px)',
                color: C.forest,
                margin: '0 0 12px',
              }}
            >
              Simple, Transparent Pricing
            </h2>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 16,
                color: 'rgba(43, 87, 38, 0.7)',
                margin: 0,
                maxWidth: 600,
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              Choose the perfect plan for your nutrition journey. Upgrade anytime.
            </p>
          </div>
        </FadeUp>

        <div
          className="pricing-grid"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 28, marginBottom: 48 }}
        >
          {PLANS.map((plan, i) => (
            <FadeUp key={plan.id} delay={i * 0.1}>
              <div
                style={{
                  background: C.bg,
                  border: plan.popular ? `2px solid ${C.tomato}` : `1px solid ${C.cream}`,
                  borderRadius: 20,
                  padding: '36px 28px',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  transform: plan.popular ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: plan.popular ? '0 10px 30px rgba(165, 12, 5, 0.15)' : '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                {plan.popular && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: C.tomato,
                      color: C.white,
                      padding: '4px 14px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                    }}
                  >
                    Most Popular
                  </div>
                )}

                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>{plan.icon}</div>
                  <h3
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 700,
                      fontSize: 20,
                      color: C.forest,
                      margin: '0 0 8px',
                    }}
                  >
                    {plan.name}
                  </h3>
                  <div
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 800,
                      fontSize: 42,
                      color: C.forest,
                      margin: '12px 0 4px',
                      letterSpacing: '-0.5px',
                    }}
                  >
                    ${plan.price}
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 500,
                        fontSize: 14,
                        color: 'rgba(43, 87, 38, 0.65)',
                      }}
                    >
                      /{plan.period}
                    </span>
                  </div>
                  {plan.monthlyEquivalent && (
                    <div
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 12,
                        color: C.tomato,
                        fontWeight: 600,
                        marginTop: 6,
                      }}
                    >
                      {plan.monthlyEquivalent}
                    </div>
                  )}
                  {plan.savings && (
                    <div
                      style={{
                        display: 'inline-block',
                        background: 'rgba(165, 12, 5, 0.1)',
                        border: `1px solid ${C.tomato}`,
                        color: C.tomato,
                        padding: '4px 12px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        marginTop: 10,
                      }}
                    >
                      {plan.savings}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28, flex: 1 }}>
                  {plan.features.map((feature, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        fontSize: 14,
                        color: 'rgba(43, 87, 38, 0.75)',
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={C.tomato}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        style={{ flexShrink: 0, marginTop: 2 }}
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {feature}
                    </div>
                  ))}
                </div>

                <button
                  style={{
                    background: plan.popular ? C.tomato : 'white',
                    color: plan.popular ? C.white : C.tomato,
                    border: plan.popular ? 'none' : `2px solid ${C.tomato}`,
                    borderRadius: 12,
                    padding: '13px 24px',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                    transition: 'all 0.2s ease',
                    width: '100%',
                  }}
                  onClick={() => handlePlanClick(plan)}
                  onMouseEnter={(e) => {
                    if (plan.popular) {
                      e.target.style.background = 'rgba(165, 12, 5, 0.9)';
                    } else {
                      e.target.style.background = 'rgba(165, 12, 5, 0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (plan.popular) {
                      e.target.style.background = C.tomato;
                    } else {
                      e.target.style.background = 'white';
                    }
                  }}
                >
                  {getButtonText()}
                </button>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
