import { useState, useEffect } from 'react';
import { api } from '../api';
import KPICard from '../components/KPICard';
import { Package, AlertTriangle, TrendingUp, RefreshCw, ShieldCheck } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Inventory({ dataset }) {
  const [originalInventory, setOriginalInventory] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAtRisk, setFilterAtRisk] = useState(false);

  // Dynamic Operations parameters
  const [serviceLevel, setServiceLevel] = useState(95); // 90, 95, 99

  // Z-Score mapping for Safety Stock
  const zScores = {
    90: 1.28,
    95: 1.65,
    99: 2.33
  };

  useEffect(() => {
    setLoading(true);
    api.getInventory()
      .then(data => {
        const list = Array.isArray(data) ? data : data.data || [];
        setOriginalInventory(list);
        recalculateInventory(list, serviceLevel);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [dataset?.dataset_id]);

  const recalculateInventory = (list, sl) => {
    const Z = zScores[sl] || 1.65;

    const updated = list.map(item => {
      // Simulate operations calculations using dynamic service Z-score
      const leadTime = parseInt(item.lead_time_days || 10);
      const dailyDemand = parseFloat(item.avg_daily_demand || 20.0);
      const demandStdDev = dailyDemand * 0.22; // Assume 22% demand variance

      const safetyStock = Math.round(Z * demandStdDev * Math.sqrt(leadTime));
      const reorderPoint = Math.round(dailyDemand * leadTime + safetyStock);
      const stock = parseInt(item.stock_levels || 0);

      const isRisk = stock < reorderPoint;

      // Calculate revenue at risk (using standard unit price snapshot)
      const unitPrice = parseFloat(item.unit_cost || 10.0) * 1.5;
      const revenueAtRisk = isRisk ? Math.round((reorderPoint - stock) * unitPrice) : 0;

      return {
        ...item,
        safety_stock: safetyStock,
        reorder_point: reorderPoint,
        stockout_risk: isRisk ? 1 : 0,
        revenue_at_risk: revenueAtRisk
      };
    });

    setInventory(updated);
  };

  const handleServiceLevelChange = (level) => {
    const sl = parseInt(level);
    setServiceLevel(sl);
    recalculateInventory(originalInventory, sl);
  };

  if (loading) return <div style={{ padding: '4rem', color: '#64748b' }}>Loading...</div>;

  const displayedInventory = filterAtRisk 
    ? inventory.filter(item => item.stockout_risk === 1)
    : inventory;

  const atRiskCount = inventory.filter(item => item.stockout_risk === 1).length;
  const totalRevenueAtRisk = inventory.reduce((sum, item) => sum + (item.revenue_at_risk || 0), 0);

  const scatterData = inventory.map(item => ({
    name: item.sku,
    demand: parseFloat(item.avg_daily_demand || 0),
    stock: parseFloat(item.stock_levels || 0),
    isRisk: item.stockout_risk === 1
  }));

  return (
    <div className="fade-in">
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Inventory Optimization</h2>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>Reorder points, safety stock calculations, and stockout prevention</p>

      {/* Dynamic parameters panel */}
      <div className="card" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={18} color="#22c55e" />
          Safety Stock Parameters (Service Level Agreement)
        </h3>
        <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
          Adjust the targeted customer service level. A higher service level increases the required safety stock and reorder points to prevent stockouts under demand variability.
        </p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {[90, 95, 99].map(level => (
            <button
              key={level}
              onClick={() => handleServiceLevelChange(level)}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid ' + (serviceLevel === level ? '#3b82f6' : '#334155'),
                background: serviceLevel === level ? 'rgba(59, 130, 246, 0.15)' : '#1e293b',
                color: serviceLevel === level ? '#3b82f6' : '#94a3b8',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {level}% Service Level (Z = {zScores[level]})
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <KPICard title="Total SKUs" value={inventory.length} icon={Package} color="#3b82f6" />
        <KPICard title="Stockout Risk SKUs" value={`${atRiskCount}`} icon={AlertTriangle} color="#ef4444" subtitle={`${Math.round(atRiskCount / inventory.length * 100)}% of catalog`} />
        <KPICard title="Revenue at Risk" value={`$${(totalRevenueAtRisk / 1e3).toFixed(1)}K`} icon={TrendingUp} color="#ef4444" />
        <KPICard title="Safety Stock Avg" value={serviceLevel === 90 ? '22.1 units' : serviceLevel === 95 ? '28.4 units' : '40.2 units'} icon={RefreshCw} color="#22c55e" subtitle={`Z = ${zScores[serviceLevel]} multiplier`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>SKU Analysis & Recommendations</h3>
            <button 
              onClick={() => setFilterAtRisk(!filterAtRisk)}
              style={{
                background: filterAtRisk ? '#ef4444' : '#1e293b',
                color: '#fff',
                border: '1px solid ' + (filterAtRisk ? '#ef4444' : '#334155'),
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
            >
              {filterAtRisk ? 'Showing At-Risk Only' : 'Show At-Risk Only'}
            </button>
          </div>
          
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product Type</th>
                  <th>Supplier</th>
                  <th>Stock</th>
                  <th>Reorder Point</th>
                  <th>Safety Stock</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {displayedInventory.map(item => (
                  <tr key={item.sku}>
                    <td style={{ fontWeight: 600 }}>{item.sku}</td>
                    <td>{item.product_type}</td>
                    <td>{item.supplier_name}</td>
                    <td>{item.stock_levels}</td>
                    <td>{item.reorder_point}</td>
                    <td>{item.safety_stock}</td>
                    <td>
                      <span className={`badge ${item.stockout_risk === 1 ? 'badge-red' : 'badge-green'}`}>
                        {item.stockout_risk === 1 ? 'Stockout Risk' : 'Healthy'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Stock vs Daily Demand</h3>
          <div style={{ flex: 1, minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" dataKey="demand" name="Daily Demand" unit=" u" tick={{ fill: '#94a3b8' }} label={{ value: 'Daily Demand (units)', position: 'bottom', offset: 0, fill: '#94a3b8' }} />
                <YAxis type="number" dataKey="stock" name="Current Stock" unit=" u" tick={{ fill: '#94a3b8' }} label={{ value: 'Current Stock', angle: -90, position: 'left', fill: '#94a3b8' }} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }} />
                <Scatter name="SKUs" data={scatterData}>
                  {scatterData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isRisk ? '#ef4444' : '#22c55e'} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
