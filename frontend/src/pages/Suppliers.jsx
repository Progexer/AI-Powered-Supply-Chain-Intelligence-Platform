import { useState, useEffect } from 'react';
import { api } from '../api';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { Sliders, RefreshCw } from 'lucide-react';

export default function Suppliers({ dataset }) {
  const [originalSuppliers, setOriginalSuppliers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dynamic Scorecard Weights (out of 100% total)
  const [weights, setWeights] = useState({
    quality: 30,
    delivery: 25,
    cost: 25,
    reliability: 20
  });

  useEffect(() => {
    setLoading(true);
    api.getSuppliers()
      .then(data => {
        const list = Array.isArray(data) ? data : data.data || [];
        setOriginalSuppliers(list);
        recalculateScores(list, weights);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [dataset?.dataset_id]);

  const recalculateScores = (list, currentWeights) => {
    const totalWeight = currentWeights.quality + currentWeights.delivery + currentWeights.cost + currentWeights.reliability;
    if (totalWeight === 0) return;

    const updated = list.map(s => {
      const qScore = parseFloat(s.quality_score || 0);
      const dScore = parseFloat(s.delivery_score || 0);
      const cScore = parseFloat(s.cost_score || 0);
      const rScore = parseFloat(s.reliability_score || 0);

      const computed = (
        (qScore * currentWeights.quality) +
        (dScore * currentWeights.delivery) +
        (cScore * currentWeights.cost) +
        (rScore * currentWeights.reliability)
      ) / totalWeight;

      // Determine risk tier based on new overall score
      let tier = 'Medium Risk';
      if (computed >= 70) tier = 'Low Risk';
      else if (computed < 40) tier = 'High Risk';

      return {
        ...s,
        overall_score: computed,
        risk_tier: tier
      };
    });

    // Sort by overall score descending
    updated.sort((a, b) => b.overall_score - a.overall_score);

    setSuppliers(updated);
    // Maintain selection or select top
    if (updated.length) {
      setSelected(prev => {
        const stillExists = updated.find(s => s.supplier_name === prev?.supplier_name);
        return stillExists || updated[0];
      });
    }
  };

  const handleWeightChange = (field, val) => {
    const num = parseInt(val) || 0;
    const newWeights = { ...weights, [field]: num };
    setWeights(newWeights);
    recalculateScores(originalSuppliers, newWeights);
  };

  const resetWeights = () => {
    const defaultWeights = { quality: 30, delivery: 25, cost: 25, reliability: 20 };
    setWeights(defaultWeights);
    recalculateScores(originalSuppliers, defaultWeights);
  };

  if (loading) return <div style={{ padding: '4rem', color: '#64748b' }}>Loading...</div>;

  const radarData = selected ? [
    { metric: 'Quality', score: Math.round(selected.quality_score) },
    { metric: 'Delivery', score: Math.round(selected.delivery_score) },
    { metric: 'Cost', score: Math.round(selected.cost_score) },
    { metric: 'Reliability', score: Math.round(selected.reliability_score) },
  ] : [];

  return (
    <div className="fade-in">
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Supplier Performance Scorer</h2>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>Adjust scoring weights in real time to simulate strategic supplier reviews</p>

      {/* Weights adjustment simulator panel */}
      <div className="card" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={18} color="#3b82f6" />
            Composite Weight Simulator
          </h3>
          <button onClick={resetWeights} style={{ background: 'none', border: 'none', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
            <RefreshCw size={12} /> Reset Weights
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
              <span>Quality Score Weight</span>
              <strong style={{ color: '#3b82f6' }}>{weights.quality}%</strong>
            </div>
            <input type="range" min="0" max="100" value={weights.quality} onChange={(e) => handleWeightChange('quality', e.target.value)} style={{ width: '100%' }} />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
              <span>Delivery Lead Time Weight</span>
              <strong style={{ color: '#22c55e' }}>{weights.delivery}%</strong>
            </div>
            <input type="range" min="0" max="100" value={weights.delivery} onChange={(e) => handleWeightChange('delivery', e.target.value)} style={{ width: '100%' }} />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
              <span>Manufacturing Cost Weight</span>
              <strong style={{ color: '#f59e0b' }}>{weights.cost}%</strong>
            </div>
            <input type="range" min="0" max="100" value={weights.cost} onChange={(e) => handleWeightChange('cost', e.target.value)} style={{ width: '100%' }} />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
              <span>Reliability (Lead variance) Weight</span>
              <strong style={{ color: '#8b5cf6' }}>{weights.reliability}%</strong>
            </div>
            <input type="range" min="0" max="100" value={weights.reliability} onChange={(e) => handleWeightChange('reliability', e.target.value)} style={{ width: '100%' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Simulated Leaderboard</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Supplier</th>
                <th>Calculated Score</th>
                <th>Risk Tier</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s, idx) => (
                <tr key={s.supplier_name} onClick={() => setSelected(s)} style={{ cursor: 'pointer', background: selected?.supplier_name === s.supplier_name ? 'rgba(59,130,246,0.1)' : 'transparent' }}>
                  <td style={{ fontWeight: 600, color: '#64748b' }}>#{idx + 1}</td>
                  <td style={{ fontWeight: 600 }}>{s.supplier_name}</td>
                  <td>{s.overall_score.toFixed(1)}/100</td>
                  <td>
                    <span className={`badge ${s.risk_tier.includes('Low') ? 'badge-green' : s.risk_tier.includes('High') ? 'badge-red' : 'badge-amber'}`}>
                      {s.risk_tier}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
            Metrics Radar: {selected ? selected.supplier_name : 'Select a supplier'}
          </h3>
          {selected && (
            <div style={{ flex: 1, minHeight: '260px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Radar dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
