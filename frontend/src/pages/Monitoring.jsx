import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { Gauge, Activity, AlertTriangle, ShieldCheck, Zap, RefreshCcw } from 'lucide-react';

export default function Monitoring() {
  const [drifted, setDrifted] = useState(false);
  const [retraining, setRetraining] = useState(false);
  const [latencyInject, setLatencyInject] = useState(false);

  // Time-series query load metrics
  const volumeData = [
    { day: 'Mon', queries: 240, latency: 14 },
    { day: 'Tue', queries: 380, latency: 16 },
    { day: 'Wed', queries: 410, latency: 15 },
    { day: 'Thu', queries: 580, latency: 19 },
    { day: 'Fri', queries: 620, latency: 18 },
    { day: 'Sat', queries: 310, latency: 12 },
    { day: 'Sun', queries: 480, latency: 15 }
  ];

  // Dynamic status parameters
  const accuracy = drifted ? 58.2 : 69.7;
  const psi = drifted ? 0.28 : 0.08;
  const latency = latencyInject ? 142 : 18;

  const handleRetrain = () => {
    setRetraining(true);
    setTimeout(() => {
      setRetraining(false);
      setDrifted(false);
      setLatencyInject(false);
    }, 2000);
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignContent: 'center', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem', fontFamily: 'Outfit, sans-serif' }}>
            ML Telemetry & Monitoring Console
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            Real-time inference profiling, performance drift metrics, and active SLA monitoring
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <span className={`badge ${drifted ? 'badge-red' : 'badge-green'}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {drifted ? <AlertTriangle size={12} /> : <ShieldCheck size={12} />}
            {drifted ? 'Model Drift Detected' : 'Operational Status: Optimal'}
          </span>
        </div>
      </div>

      {/* Drift Alert Banner */}
      {drifted && (
        <div className="fade-in" style={{
          background: 'rgba(239, 68, 68, 0.06)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '16px',
          padding: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 8px 30px rgba(239, 68, 68, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={20} color="#ef4444" />
            </div>
            <div>
              <h4 style={{ fontWeight: 700, color: '#f87171', fontSize: '0.9rem' }}>Attention: Random Forest Classifier Performance Degraded</h4>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                Population Stability Index (PSI) exceeded warning threshold (0.2). Current accuracy: <strong>{accuracy}%</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={handleRetrain}
            disabled={retraining}
            style={{
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.2)'
            }}
          >
            {retraining ? (
              <>
                <RefreshCcw className="animate-spin" size={14} /> Re-training...
              </>
            ) : (
              <>
                <RefreshCcw size={14} /> Trigger AutoML Pipeline
              </>
            )}
          </button>
        </div>
      )}

      {/* Telemetry Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        
        <div className="kpi-card">
          <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Inference Latency</p>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: latency > 100 ? '#ef4444' : '#3b82f6', fontFamily: 'Outfit, sans-serif' }}>
            {latency}ms
          </p>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px' }}>
            {latency > 100 ? '⚠️ Network queue bottleneck' : '✅ Healthy SLA response'}
          </p>
        </div>

        <div className="kpi-card">
          <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Model Accuracy</p>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: drifted ? '#ef4444' : '#10b981', fontFamily: 'Outfit, sans-serif' }}>
            {accuracy}%
          </p>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px' }}>
            {drifted ? '📉 Dropped below baseline (69.7%)' : '✅ Operating within threshold'}
          </p>
        </div>

        <div className="kpi-card">
          <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Data Drift index (PSI)</p>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: drifted ? '#ef4444' : '#10b981', fontFamily: 'Outfit, sans-serif' }}>
            {psi.toFixed(2)}
          </p>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px' }}>
            {drifted ? '⚠️ High drift: features shifted' : '✅ Low drift: stable features'}
          </p>
        </div>

        <div className="kpi-card">
          <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Active Telemetry Nodes</p>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: '#8b5cf6', fontFamily: 'Outfit, sans-serif' }}>
            3 Active
          </p>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px' }}>
            Dashboard, Model, ETL
          </p>
        </div>

      </div>

      {/* Grid Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        
        {/* Chart 1: Traffic & Volume */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="#3b82f6" />
            Daily Inference Load (Total Queries)
          </h3>
          <div style={{ height: '230px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeData}>
                <defs>
                  <linearGradient id="queryColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="queries" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#queryColor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Simulator controls */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Gauge size={18} color="#8b5cf6" />
            Operational Simulation Panel
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
            Simulate live production events to test system thresholds and auto-alert routines.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(3,7,18,0.4)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div>
                <p style={{ fontSize: '0.85rem', fontWeight: 700 }}>Inject Feature Data Drift</p>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Simulate shift in consumer category parameters</p>
              </div>
              <button
                onClick={() => setDrifted(!drifted)}
                disabled={retraining}
                style={{
                  background: drifted ? '#374151' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                {drifted ? 'Reset Drift' : 'Drift Model'}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(3,7,18,0.4)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div>
                <p style={{ fontSize: '0.85rem', fontWeight: 700 }}>Inject Latency Bottleneck</p>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Simulate database connection queue delay</p>
              </div>
              <button
                onClick={() => setLatencyInject(!latencyInject)}
                style={{
                  background: latencyInject ? '#374151' : 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                {latencyInject ? 'Reset Latency' : 'Inject Delay'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
