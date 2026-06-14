import { useState, useEffect } from 'react';
import { api } from '../api';
import KPICard from '../components/KPICard';
import { Truck, Clock, AlertTriangle, BarChart3, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

export default function Logistics() {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  // Shipping mode analysis from statistical findings
  const shippingModeData = [
    { mode: 'First Class', delayRate: 59.8, avgDelay: 2.8, color: '#ef4444' },
    { mode: 'Second Class', delayRate: 48.2, avgDelay: 2.1, color: '#f59e0b' },
    { mode: 'Standard Class', delayRate: 54.1, avgDelay: 3.4, color: '#3b82f6' },
    { mode: 'Same Day', delayRate: 19.5, avgDelay: 0.6, color: '#10b981' }
  ];

  useEffect(() => {
    api.getKPIs()
      .then(setKpis)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: '4rem', color: '#64748b' }}>Loading...</div>;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem', fontFamily: 'Outfit, sans-serif' }}>
          Logistics Performance & Delay Analytics
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
          Audit shipment delays and shipping mode correlation tests mapped from statistical reports
        </p>
      </div>

      {kpis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          <KPICard title="On-Time Delivery Rate" value={`${kpis.on_time_delivery_rate_pct}%`} icon={Truck} color="#10b981" subtitle="SLA Target: 85%" />
          <KPICard title="Late Shipments Count" value={kpis.late_shipments?.toLocaleString()} icon={Clock} color="#ef4444" subtitle="54.8% of total catalog" />
          <KPICard title="Total Analyzed Orders" value={kpis.total_orders?.toLocaleString()} icon={AlertTriangle} color="#3b82f6" subtitle="Dataset 1 features" />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        
        {/* Shipping Mode Delay Rates */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={18} color="#3b82f6" />
            Delay Rates by Shipping Mode (%)
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Visualizes late shipment frequencies confirmed by Cramer's V association analysis.
          </p>
          <div style={{ flex: 1, minHeight: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shippingModeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="mode" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis unit="%" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.06)', color: '#f1f5f9', borderRadius: '8px' }} />
                <Bar dataKey="delayRate" radius={[6, 6, 0, 0]}>
                  {shippingModeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Statistical Report Insights */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={18} color="#8b5cf6" />
            Statistical Analytics
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ padding: '10px 14px', background: 'rgba(3,7,18,0.4)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '10px' }}>
              <span className="badge badge-red" style={{ marginBottom: '6px' }}>H2: Shipping Mode Association</span>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.4 }}>
                Chi-square test returned a <strong>p-value of 0.00</strong> with a Cramer's V of <strong>0.4571</strong> (medium-to-strong effect). Shipping mode choice directly impacts delay probability.
              </p>
            </div>

            <div style={{ padding: '10px 14px', background: 'rgba(3,7,18,0.4)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '10px' }}>
              <span className="badge badge-green" style={{ marginBottom: '6px' }}>H1: Profit Margin Independence</span>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.4 }}>
                Welch t-test returned a non-significant <strong>p-value of 0.2682</strong>. Logistics delay duration does not significantly alter order profit margins.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
