import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function KPICard({ title, value, subtitle, icon: Icon, color = '#3b82f6', trend, to }) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : '#64748b';

  const cardContent = (
    <div className="kpi-card fade-in" style={{ height: '100%', cursor: to ? 'pointer' : 'default' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {title}
          </p>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: 4, color }}>
            {value}
          </p>
          {subtitle && (
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              {trend && <TrendIcon size={14} color={trendColor} />}
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: `${color}15`, display: 'flex',
            alignItems: 'center', justifyContent: 'center'
          }}>
            <Icon size={22} color={color} />
          </div>
        )}
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} style={{ textDecoration: 'none', color: 'inherit' }}>
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
