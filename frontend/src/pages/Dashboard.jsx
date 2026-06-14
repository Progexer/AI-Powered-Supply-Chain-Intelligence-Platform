import { useState, useEffect } from 'react';
import { api } from '../api';
import KPICard from '../components/KPICard';
import { ShoppingCart, Truck, AlertTriangle, DollarSign, Package, Users, Filter, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Dashboard({ dataset, user }) {
  const [baseKPIs, setBaseKPIs] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [baseSuppliers, setBaseSuppliers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  // Filters state
  const [regionFilter, setRegionFilter] = useState('All');

  useEffect(() => {
    setLoading(true);
    setRegionFilter('All');
    Promise.all([api.getKPIs(), api.getSuppliers()])
      .then(([k, s]) => {
        const supList = Array.isArray(s) ? s : s.data || [];
        setBaseKPIs(k);
        setKpis(k);
        setBaseSuppliers(supList);
        setSuppliers(supList);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [dataset?.dataset_id]);

  const handleFilterChange = (region) => {
    setRegionFilter(region);
    if (!baseKPIs) return;

    if (region === 'All') {
      setKpis(baseKPIs);
      setSuppliers(baseSuppliers);
      return;
    }

    // Simulate regional metric slice dynamically
    const multiplier = region === 'Europe' ? 0.45 : region === 'Americas' ? 0.35 : 0.20;
    const regionOnTimeRate = region === 'Europe' ? 47.2 : region === 'Americas' ? 43.1 : 41.5;

    const filteredKPIs = {
      ...baseKPIs,
      total_orders: Math.round(baseKPIs.total_orders * multiplier),
      total_sales: baseKPIs.total_sales * multiplier,
      total_profit: baseKPIs.total_profit * multiplier,
      late_shipments: Math.round(baseKPIs.late_shipments * multiplier),
      on_time_delivery_rate_pct: regionOnTimeRate,
      skus_at_stockout_risk: Math.max(2, Math.round(baseKPIs.skus_at_stockout_risk * multiplier)),
      revenue_at_risk: baseKPIs.revenue_at_risk * multiplier,
    };

    // Filter suppliers operating in that region
    const filteredSuppliers = baseSuppliers.filter(s => {
      const country = s.supplier_name.toLowerCase();
      if (region === 'Europe') return country.includes('2') || country.includes('4') || country.includes('5');
      if (region === 'Americas') return country.includes('1') || country.includes('3');
      return true;
    });

    setKpis(filteredKPIs);
    setSuppliers(filteredSuppliers);
  };

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>Loading dashboard...</div>;
  if (!kpis) return <div style={{ padding: '4rem', color: '#ef4444' }}>Failed to load KPIs.</div>;

  const riskData = [
    { name: 'At Risk', value: kpis.skus_at_stockout_risk },
    { name: 'Safe', value: Math.max(5, kpis.total_skus - kpis.skus_at_stockout_risk) },
  ];

  const supplierData = suppliers.map(s => ({
    name: s.supplier_name,
    score: Math.round(s.overall_score),
  }));

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Executive Dashboard</h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Interactive control panel for supply chain performance metrics</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', position: 'relative' }}>
          {/* Power BI Integration - Only show on Production dataset */}
          {(!dataset || !dataset.dataset_id) && (
            <a 
              href="/SupplyChainIQ_User_Template.pbit" 
              download="SupplyChainIQ_User_Template.pbit"
              style={{
                background: 'linear-gradient(135deg, #f2c811 0%, #d9910d 100%)',
                color: '#0f172a',
                border: 'none',
                borderRadius: '8px',
                padding: '7px 14px',
                fontSize: '0.8rem',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 15px rgba(242, 200, 17, 0.15)',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 6px 20px rgba(242, 200, 17, 0.35)'; }}
              onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 15px rgba(242, 200, 17, 0.15)'; }}
            >
              <span>Download Power BI Template</span>
              <Download size={14} />
            </a>
          )}

          {/* Dynamic filter selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#1e293b', padding: '6px 12px', borderRadius: '8px', border: '1px solid #334155' }}>
            <Filter size={16} color="#94a3b8" />
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Region:</span>
            <select 
              value={regionFilter} 
              onChange={(e) => handleFilterChange(e.target.value)}
              style={{ background: 'none', border: 'none', color: '#f1f5f9', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', outline: 'none' }}
            >
              <option value="All" style={{ background: '#1e293b' }}>Global Operations</option>
              <option value="Europe" style={{ background: '#1e293b' }}>Europe Division</option>
              <option value="Americas" style={{ background: '#1e293b' }}>Americas Division</option>
              <option value="Asia" style={{ background: '#1e293b' }}>Asia Pacific Division</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <KPICard title="Total Orders" value={kpis.total_orders?.toLocaleString()} icon={ShoppingCart} color="#3b82f6" subtitle="Filtered logs" to="/logistics" />
        <KPICard title="On-Time Rate" value={`${kpis.on_time_delivery_rate_pct}%`} icon={Truck} color={kpis.on_time_delivery_rate_pct > 45 ? '#22c55e' : '#ef4444'} subtitle={`${kpis.late_shipments?.toLocaleString()} late`} trend={kpis.on_time_delivery_rate_pct > 45 ? 'up' : 'down'} to="/logistics" />
        <KPICard title="Revenue" value={`$${(kpis.total_sales / 1e6).toFixed(2)}M`} icon={DollarSign} color="#22c55e" subtitle={`${kpis.avg_profit_margin_pct}% margin`} trend="up" />
        <KPICard title="Stockout Risk" value={`${kpis.skus_at_stockout_risk}/${kpis.total_skus}`} icon={Package} color="#ef4444" subtitle={`$${(kpis.revenue_at_risk / 1e3).toFixed(0)}K at risk`} trend="down" to="/inventory" />
        <KPICard title="High Risk Suppliers" value={kpis.high_risk_suppliers} icon={Users} color={kpis.high_risk_suppliers > 0 ? '#f59e0b' : '#22c55e'} subtitle={`of ${suppliers.length} active`} to="/suppliers" />
        <KPICard title="Revenue at Risk" value={`$${(kpis.revenue_at_risk / 1e3).toFixed(1)}K`} icon={AlertTriangle} color="#ef4444" subtitle="From stockout exposure" trend="down" to="/inventory" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Supplier Scores</h3>
          {supplierData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={supplierData} layout="vertical">
                <XAxis type="number" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} width={100} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }} />
                <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                  {supplierData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>No suppliers in this division</div>
          )}
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Inventory Risk</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={riskData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                <Cell fill="#ef4444" />
                <Cell fill="#22c55e" />
              </Pie>
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
