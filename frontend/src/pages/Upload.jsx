import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, CheckCircle2, AlertCircle, RefreshCw, Database } from 'lucide-react';

import { api } from '../api';

export default function DatasetUpload({ onUpload }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (selected.name.endsWith('.csv')) {
        setFile(selected);
        setError(null);
        setSuccess(false);
      } else {
        setError('Only CSV files are supported.');
        setFile(null);
      }
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const userStr = localStorage.getItem('supplychainiq_current_user');
      if (!userStr) {
        setError('User session expired. Please sign in again.');
        setLoading(false);
        return;
      }
      const user = JSON.parse(userStr);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dataset_name', file.name.replace(/\.[^/.]+$/, ""));
      
      const res = await api.uploadDataset(formData, user.email);
      
      setLoading(false);
      setSuccess(true);
      onUpload({
        dataset_id: res.dataset_id,
        filename: file.name,
        size: file.size,
        dataset_type: res.dataset_type
      });
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Validation failed. Please verify the CSV format.');
      setLoading(false);
    }
  };

  const useDefaultDataset = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onUpload({ filename: 'SupplyChainIQ_Active_Master_Dataset.csv', size: 100582912 });
      navigate('/dashboard');
    }, 500);
  };

  return (
    <div className="fade-in" style={{
      background: 'radial-gradient(circle at 50% 0%, #111827 0%, #030712 100%)',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      width: '100%',
      position: 'relative'
    }}>
      <div style={{ position: 'absolute', width: '300px', height: '300px', background: 'rgba(59, 130, 246, 0.08)', filter: 'blur(100px)', zIndex: 0 }}></div>

      <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '3rem', textAlign: 'center', zIndex: 1 }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem', fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em', background: 'linear-gradient(to right, #fff, #9ca3af)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Data Ingestion Console
        </h2>
        <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '2.5rem' }}>
          Ingest warehouse logs, stock metrics, or vendor scores to execute modeling pipelines
        </p>

        <form onSubmit={handleUploadSubmit} style={{ marginBottom: '1.5rem' }}>
          <div style={{
            border: '2px dashed ' + (error ? '#ef4444' : success ? '#10b981' : 'rgba(255,255,255,0.08)'),
            borderRadius: '12px',
            padding: '3rem 1.5rem',
            background: 'rgba(3, 7, 18, 0.4)',
            cursor: 'pointer',
            position: 'relative',
            marginBottom: '1.5rem',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { if (!success && !error && !loading) e.target.style.borderColor = 'rgba(59, 130, 246, 0.3)'; }}
          onMouseLeave={(e) => { if (!success && !error && !loading) e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
          >
            <input
              type="file"
              onChange={handleFileChange}
              accept=".csv,.json"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer'
              }}
            />
            
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <RefreshCw className="animate-spin" size={38} color="#3b82f6" />
                <p style={{ fontSize: '0.9rem', color: '#f9fafb', fontWeight: 600 }}>Running schema validation...</p>
                <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Verifying column dimensions and type boundaries</p>
              </div>
            ) : success ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <CheckCircle2 size={38} color="#10b981" />
                <p style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 600 }}>Validation Complete</p>
                <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{file?.name} uploaded successfully</p>
              </div>
            ) : file ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <FileText size={38} color="#3b82f6" />
                <p style={{ fontSize: '0.9rem', color: '#f9fafb', fontWeight: 600 }}>{file.name}</p>
                <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>{(file.size / 1024).toFixed(1)} KB • Click or drag to replace</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <Upload size={38} color="#4b5563" />
                <p style={{ fontSize: '0.9rem', color: '#f9fafb', fontWeight: 600 }}>Select supply chain dataset</p>
                <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Accepts .csv or .json formatted datasets up to 100MB</p>
              </div>
            )}
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '0.8rem', justifyContent: 'center', marginBottom: '1rem' }}>
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!file || loading || success}
            style={{
              width: '100%',
              background: !file || loading || success ? 'rgba(255,255,255,0.02)' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: !file || loading || success ? '#4b5563' : '#fff',
              border: !file || loading || success ? '1px solid rgba(255,255,255,0.04)' : 'none',
              borderRadius: '10px',
              padding: '14px',
              fontWeight: 600,
              cursor: !file || loading || success ? 'default' : 'pointer',
              fontSize: '0.95rem',
              transition: 'all 0.2s',
              boxShadow: !file || loading || success ? 'none' : '0 4px 15px rgba(59, 130, 246, 0.2)'
            }}
          >
            Execute Ingestion ETL Pipeline
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '2rem 0', color: '#374151', fontSize: '0.8rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.04)' }}></div>
          <span>DATABASE MODE</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.04)' }}></div>
        </div>

        <button
          onClick={useDefaultDataset}
          disabled={loading}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.02)',
            color: '#9ca3af',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '10px',
            padding: '12px',
            fontSize: '0.85rem',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => { e.target.style.background = 'rgba(255,255,255,0.04)'; e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={(e) => { e.target.style.background = 'rgba(255,255,255,0.02)'; e.target.style.borderColor = 'rgba(255,255,255,0.06)'; }}
        >
          <Database size={16} color="#3b82f6" />
          Connect to Production Database Schema
        </button>
      </div>
    </div>
  );
}
