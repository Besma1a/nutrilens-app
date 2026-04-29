import { Link } from 'react-router-dom';

export default function UpgradeCard({
  title = 'Unlock Premium',
  description = 'Get meal plans, direct nutritionist chat, and consultations.',
  ctaText = 'Upgrade Now',
  compact = false,
}) {
  return (
    <div
      style={{
        background: compact
          ? 'var(--green-50)'
          : 'linear-gradient(135deg, var(--green-500), var(--green-700))',
        border: compact ? '1px solid var(--border)' : 'none',
        borderRadius: 'var(--r-lg)',
        padding: compact ? '14px 16px' : '18px',
        color: compact ? 'var(--gray-800)' : 'white',
      }}
    >
      <div style={{ fontSize: compact ? 22 : 30, marginBottom: 8 }}>🔒</div>
      <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{title}</h4>
      <p style={{ fontSize: 12, opacity: 0.9, marginBottom: 12, lineHeight: 1.5 }}>
        {description}
      </p>
      <Link
        to="/user/subscribe"
        className="btn"
        style={{
          background: compact ? 'var(--green)' : 'white',
          color: compact ? 'white' : 'var(--green-dark)',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        {ctaText}
      </Link>
    </div>
  );
}