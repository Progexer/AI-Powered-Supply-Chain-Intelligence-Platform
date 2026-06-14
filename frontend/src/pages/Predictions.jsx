import { useState, useEffect } from 'react';
import { api } from '../api';
import { Brain, AlertCircle, CheckCircle2, DollarSign, Sparkles, History, Clock } from 'lucide-react';

export default function Predictions() {
  const currentUser = JSON.parse(localStorage.getItem('supplychainiq_current_user') || '{}');
  const userEmail = currentUser.email || 'offline_user';

  // Forms State
  const [delayForm, setDelayForm] = useState({
    shipping_mode: 'Standard Class',
    order_region: 'Western Europe',
    category_name: 'Cleats',
    market: 'Europe',
    customer_segment: 'Consumer',
    department_name: 'Fan Shop',
    sales: 200.0,
    discount_rate_pct: 10.0,
    scheduled_shipping_days: 4,
    benefit_per_order: 20.0
  });

  const [delayResult, setDelayResult] = useState(null);
  const [delayLoading, setDelayLoading] = useState(false);
  const [delayError, setDelayError] = useState(null);

  const [demandForm, setDemandForm] = useState({
    category_name: 'Cleats',
    order_region: 'Western Europe',
    market: 'Europe',
    shipping_mode: 'Standard Class',
    customer_segment: 'Consumer',
    department_name: 'Fan Shop',
    discount_rate_pct: 10.0,
    benefit_per_order: 20.0,
    scheduled_shipping_days: 4
  });

  const [demandResult, setDemandResult] = useState(null);
  const [demandLoading, setDemandLoading] = useState(false);
  const [demandError, setDemandError] = useState(null);

  // Predictions history log state
  const [history, setHistory] = useState([]);

  // Load history from Supabase (with localStorage offline fallback)
  const loadHistory = async () => {
    try {
      const data = await api.getPredictionHistory(userEmail);
      if (Array.isArray(data)) {
        setHistory(data);
        return;
      }
    } catch (err) {
      console.warn("Offline or Supabase unconnected. Loading local history fallback.");
    }
    // Local fallback
    const local = JSON.parse(localStorage.getItem(`supplychainiq_pred_history_${userEmail}`) || '[]');
    setHistory(local);
  };

  useEffect(() => {
    loadHistory();
  }, [userEmail]);

  // Save prediction log locally & in DB
  const saveLogLocal = (logItem) => {
    const local = JSON.parse(localStorage.getItem(`supplychainiq_pred_history_${userEmail}`) || '[]');
    const updated = [logItem, ...local].slice(0, 15); // limit to 15 items
    localStorage.setItem(`supplychainiq_pred_history_${userEmail}`, JSON.stringify(updated));
    setHistory(updated);
  };

  const handleDelayChange = (e) => {
    const { name, value } = e.target;
    setDelayForm(prev => ({
      ...prev,
      [name]: ['sales', 'discount_rate_pct', 'scheduled_shipping_days', 'benefit_per_order'].includes(name) ? parseFloat(value) : value
    }));
  };

  const handleDemandChange = (e) => {
    const { name, value } = e.target;
    setDemandForm(prev => ({
      ...prev,
      [name]: ['discount_rate_pct', 'benefit_per_order', 'scheduled_shipping_days'].includes(name) ? parseFloat(value) : value
    }));
  };

  const runDelayPrediction = async (e) => {
    e.preventDefault();
    setDelayLoading(true);
    setDelayError(null);
    setDelayResult(null);
    try {
      const payload = { ...delayForm, user_email: userEmail };
      const res = await api.predictDelay(payload);
      setDelayResult(res);

      // Save to logs
      saveLogLocal({
        created_at: new Date().toISOString(),
        prediction_type: 'delay',
        input_features: delayForm,
        output_result: res
      });
    } catch (err) {
      setDelayError(err.message || 'Prediction failed');
    } finally {
      setDelayLoading(false);
    }
  };

  const runDemandForecast = async (e) => {
    e.preventDefault();
    setDemandLoading(true);
    setDemandError(null);
    setDemandResult(null);
    try {
      const payload = { ...demandForm, user_email: userEmail };
      const res = await api.predictDemand(payload);
      setDemandResult(res);

      // Save to logs
      saveLogLocal({
        created_at: new Date().toISOString(),
        prediction_type: 'demand',
        input_features: demandForm,
        output_result: res
      });
    } catch (err) {
      setDemandError(err.message || 'Forecast failed');
    } finally {
      setDemandLoading(false);
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem', fontFamily: 'Outfit, sans-serif' }}>
          AI Predictions Playground
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
          Simulate logistics delays and calculate market demand using verified machine learning models
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        
        {/* Model 1: Shipment Delay Predictor */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Brain color="#3b82f6" size={24} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>Delay Risk Predictor</h3>
            </div>
            <span className="badge badge-blue">Classifier</span>
          </div>
          
          <form onSubmit={runDelayPrediction} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 600 }}>SHIPPING MODE</label>
                <select name="shipping_mode" value={delayForm.shipping_mode} onChange={handleDelayChange} style={{ width: '100%' }}>
                  <option>Standard Class</option>
                  <option>Second Class</option>
                  <option>First Class</option>
                  <option>Same Day</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 600 }}>ORDER REGION</label>
                <input name="order_region" value={delayForm.order_region} onChange={handleDelayChange} style={{ width: '100%' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 600 }}>CATEGORY NAME</label>
                <input name="category_name" value={delayForm.category_name} onChange={handleDelayChange} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 600 }}>MARKET</label>
                <input name="market" value={delayForm.market} onChange={handleDelayChange} style={{ width: '100%' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 600 }}>CUSTOMER SEGMENT</label>
                <input name="customer_segment" value={delayForm.customer_segment} onChange={handleDelayChange} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 600 }}>DEPARTMENT NAME</label>
                <input name="department_name" value={delayForm.department_name} onChange={handleDelayChange} style={{ width: '100%' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 600 }}>SALES ($)</label>
                <input type="number" name="sales" value={delayForm.sales} onChange={handleDelayChange} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 600 }}>DISCOUNT %</label>
                <input type="number" name="discount_rate_pct" value={delayForm.discount_rate_pct} onChange={handleDelayChange} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 600 }}>DAYS</label>
                <input type="number" name="scheduled_shipping_days" value={delayForm.scheduled_shipping_days} onChange={handleDelayChange} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 600 }}>BENEFIT ($)</label>
                <input type="number" name="benefit_per_order" value={delayForm.benefit_per_order} onChange={handleDelayChange} style={{ width: '100%' }} />
              </div>
            </div>

            <button type="submit" disabled={delayLoading} style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: '10px',
              fontSize: '0.9rem',
              boxShadow: '0 4px 15px rgba(59, 130, 246, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              {delayLoading ? 'Executing Inference...' : 'Predict Shipment Delay'} <Sparkles size={16} />
            </button>
          </form>

          {delayError && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '10px' }}>{delayError}</div>}
          
          {delayResult && (
            <div style={{
              marginTop: '1rem',
              padding: '1.25rem',
              background: 'rgba(3, 7, 18, 0.5)',
              borderRadius: '12px',
              border: '1px solid ' + (delayResult.prediction === 1 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'),
              boxShadow: 'inset 0 0 10px ' + (delayResult.prediction === 1 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)')
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                {delayResult.prediction === 1 ? <AlertCircle color="#ef4444" size={18} /> : <CheckCircle2 color="#10b981" size={18} />}
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: delayResult.prediction === 1 ? '#ef4444' : '#10b981' }}>
                  {delayResult.label} Delivery Predicted
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Probability of Late Delay: <strong style={{ color: '#f1f5f9' }}>{(delayResult.probability_late * 100).toFixed(1)}%</strong>
              </p>
              <div style={{ marginTop: '12px' }}>
                <span className={delayResult.prediction === 1 ? 'badge badge-red' : 'badge-green'}>
                  {delayResult.prediction === 1 ? '⚠️ Escalate shipping or re-route carrier' : '✅ On schedule. No action required'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Model 2: Demand Forecaster */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Brain color="#10b981" size={24} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>Demand Forecaster</h3>
            </div>
            <span className="badge badge-green">Regressor</span>
          </div>

          <form onSubmit={runDemandForecast} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 600 }}>CATEGORY NAME</label>
                <input name="category_name" value={demandForm.category_name} onChange={handleDemandChange} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 600 }}>ORDER REGION</label>
                <input name="order_region" value={demandForm.order_region} onChange={handleDemandChange} style={{ width: '100%' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 600 }}>MARKET</label>
                <input name="market" value={demandForm.market} onChange={handleDemandChange} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 600 }}>SHIPPING MODE</label>
                <select name="shipping_mode" value={demandForm.shipping_mode} onChange={handleDemandChange} style={{ width: '100%' }}>
                  <option>Standard Class</option>
                  <option>Second Class</option>
                  <option>First Class</option>
                  <option>Same Day</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 600 }}>CUSTOMER SEGMENT</label>
                <input name="customer_segment" value={demandForm.customer_segment} onChange={handleDemandChange} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 600 }}>DEPARTMENT NAME</label>
                <input name="department_name" value={demandForm.department_name} onChange={handleDemandChange} style={{ width: '100%' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 600 }}>DISCOUNT %</label>
                <input type="number" name="discount_rate_pct" value={demandForm.discount_rate_pct} onChange={handleDemandChange} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 600 }}>BENEFIT ($)</label>
                <input type="number" name="benefit_per_order" value={demandForm.benefit_per_order} onChange={handleDemandChange} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 600 }}>DAYS</label>
                <input type="number" name="scheduled_shipping_days" value={demandForm.scheduled_shipping_days} onChange={handleDemandChange} style={{ width: '100%' }} />
              </div>
            </div>

            <button type="submit" disabled={demandLoading} style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: '10px',
              fontSize: '0.9rem',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              {demandLoading ? 'Executing Forecast...' : 'Forecast Order Sales'} <Sparkles size={16} />
            </button>
          </form>

          {demandError && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '10px' }}>{demandError}</div>}
          
          {demandResult && (
            <div style={{
              marginTop: '1rem',
              padding: '1.25rem',
              background: 'rgba(3, 7, 18, 0.5)',
              borderRadius: '12px',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              boxShadow: 'inset 0 0 10px rgba(16, 185, 129, 0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <DollarSign color="#10b981" size={18} />
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f1f5f9' }}>
                  Predicted Sales Output
                </span>
              </div>
              <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', fontFamily: 'Outfit, sans-serif' }}>
                ${demandResult.predicted_sales?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div style={{ marginTop: '12px' }}>
                <span className="badge badge-blue">
                  ℹ️ Procurement Action: Align order quantity with predicted levels
                </span>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Predictions History Table */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.75rem' }}>
          <History size={20} color="#3b82f6" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>Your Predictions History</h3>
        </div>
        
        {history.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
            No prediction logs found for your profile yet. Try submitting the forms above!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Model Type</th>
                  <th>Input Attributes</th>
                  <th>Prediction Result</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, idx) => {
                  const date = new Date(item.created_at).toLocaleString();
                  const isDelay = item.prediction_type === 'delay';
                  const features = item.input_features || {};
                  
                  return (
                    <tr key={idx}>
                      <td style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={12} color="#64748b" /> {date}
                      </td>
                      <td>
                        <span className={isDelay ? 'badge badge-blue' : 'badge-green'}>
                          {isDelay ? 'Delay Classifier' : 'Demand Regressor'}
                        </span>
                      </td>
                      <td style={{ color: '#94a3b8', maxWidth: '350px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {isDelay ? (
                          `Mode: ${features.shipping_mode} | Region: ${features.order_region} | Sales: $${features.sales}`
                        ) : (
                          `Category: ${features.category_name} | Region: ${features.order_region} | Discount: ${features.discount_rate_pct}%`
                        )}
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        {isDelay ? (
                          item.output_result?.prediction === 1 ? (
                            <span style={{ color: '#ef4444' }}>⚠️ Late ({(item.output_result.probability_late * 100).toFixed(0)}%)</span>
                          ) : (
                            <span style={{ color: '#10b981' }}>✅ On Time</span>
                          )
                        ) : (
                          <span style={{ color: '#10b981' }}>
                            ${item.output_result?.predicted_sales?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
