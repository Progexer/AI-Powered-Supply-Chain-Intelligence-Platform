import { useState, useEffect } from 'react';
import { api } from '../api';
import { Shield, Cpu, Calendar, Activity } from 'lucide-react';

export default function Models() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getModels()
      .then(data => setModels(Array.isArray(data) ? data : data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: '4rem', color: '#64748b' }}>Loading...</div>;

  return (
    <div className="fade-in">
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>ML Model Registry</h2>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>Traceable metadata, versions, and validation metrics for audited models</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        {models.map(model => (
          <div key={model.model_name} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#3b82f6', textTransform: 'capitalize' }}>
                  {model.model_name.replace('_', ' ')}
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                  Algorithm: <strong>{model.algorithm}</strong> | Target: <code>{model.target_column}</code>
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="badge badge-blue">v{model.model_version}</span>
                <span className="badge badge-green" style={{ textTransform: 'capitalize' }}>{model.status}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              {Object.entries(model.metrics || {}).map(([key, val]) => (
                <div key={key} style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', flexDirection: 'column', justifyBetween: 'center' }}>
                  <p style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                    {key.replace('_', ' ')}
                  </p>
                  {typeof val === 'object' && val !== null ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                      {Object.entries(val).map(([k, v]) => (
                        <span key={k} style={{ fontSize: '0.65rem', background: 'rgba(59, 130, 246, 0.08)', color: '#93c5fd', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.15)', fontWeight: 500 }}>
                          {k}: <strong>{v}</strong>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '4px', color: '#f1f5f9' }}>
                      {typeof val === 'number' ? val.toLocaleString(undefined, { maximumFractionDigits: 4 }) : String(val)}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                <Shield size={16} color="#64748b" style={{ flexShrink: 0 }} />
                <span>Artifact Path:</span>
                <code style={{ color: '#3b82f6', marginLeft: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'rtl', textAlign: 'left' }} title={model.artifact_path}>
                  {model.artifact_path}
                </code>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={16} color="#64748b" style={{ flexShrink: 0 }} />
                <span>Trained At:</span>
                <span style={{ marginLeft: '4px', color: '#f1f5f9' }}>{new Date(model.trained_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
