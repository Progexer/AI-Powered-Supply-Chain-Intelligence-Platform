import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Zap, BarChart3, Database, Globe, Layers, Activity } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="fade-in" style={{
      background: 'radial-gradient(circle at 50% 0%, #0f172a 0%, #030712 100%)',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      color: '#f9fafb',
      width: '100%',
      position: 'relative'
    }}>
      {/* Decorative Blur Spheres */}
      <div style={{ position: 'absolute', width: '400px', height: '400px', background: 'rgba(59, 130, 246, 0.08)', filter: 'blur(120px)', top: '-10%', left: '10%', pointerEvents: 'none' }}></div>
      <div style={{ position: 'absolute', width: '400px', height: '400px', background: 'rgba(139, 92, 246, 0.05)', filter: 'blur(120px)', bottom: '10%', right: '10%', pointerEvents: 'none' }}></div>

      {/* Landing Header */}
      <header style={{
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '1.5rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3b82f6', letterSpacing: '-0.02em', fontFamily: 'Outfit, sans-serif' }}>
            ⚡ SupplyChainIQ
          </span>
        </div>
        <Link to="/login" style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          color: '#f9fafb',
          textDecoration: 'none',
          padding: '8px 18px',
          borderRadius: '10px',
          fontSize: '0.85rem',
          fontWeight: 600,
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => { e.target.style.background = 'rgba(59,130,246,0.1)'; e.target.style.borderColor = '#3b82f6'; }}
        onMouseLeave={(e) => { e.target.style.background = 'rgba(255,255,255,0.03)'; e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
        >
          Sign In
        </Link>
      </header>

      {/* Hero Content */}
      <main style={{
        flex: 1,
        width: '100%',
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '6rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        zIndex: 10
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          padding: '6px 14px',
          borderRadius: '99px',
          marginBottom: '2.5rem'
        }}>
          <Zap size={14} color="#3b82f6" />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Next-Gen Supply Intelligence Platform
          </span>
        </div>

        <h1 style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: '4.25rem',
          fontWeight: 800,
          lineHeight: '1.05',
          letterSpacing: '-0.03em',
          background: 'linear-gradient(135deg, #ffffff 30%, #a5b4fc 70%, #3b82f6 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '1.5rem',
          maxWidth: '850px'
        }}>
          Smarter Predictions, Optimized Inventory.
        </h1>

        <p style={{
          fontSize: '1.2rem',
          color: '#9ca3af',
          lineHeight: '1.6',
          maxWidth: '650px',
          marginBottom: '3rem',
          fontWeight: 400
        }}>
          Simulate logistics delays, recalculate safety stock limits dynamically, score vendors, and monitor catalog operations through an integrated, modern analytics console.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '6rem' }}>
          <Link to="/login" style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            fontWeight: 600,
            padding: '14px 28px',
            borderRadius: '12px',
            fontSize: '0.95rem',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 6px 25px rgba(59, 130, 246, 0.45)'; }}
          onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 20px rgba(59, 130, 246, 0.3)'; }}
          >
            Launch Platform Console <ArrowRight size={16} />
          </Link>
        </div>

        {/* Feature Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2rem',
          textAlign: 'left',
          width: '100%'
        }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyCent: 'center', justifyContent: 'center' }}>
              <Database size={22} color="#3b82f6" />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>Dynamic Ingestion</h3>
            <p style={{ fontSize: '0.85rem', color: '#9ca3af', lineHeight: 1.6 }}>
              Upload custom CSV datasets and run automated verification checks, quality profiling, and schema validations.
            </p>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={22} color="#10b981" />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>SLA Adjustments</h3>
            <p style={{ fontSize: '0.85rem', color: '#9ca3af', lineHeight: 1.6 }}>
              Interact with service level parameters to instantly compute safety stock limits and evaluate potential revenue exposure.
            </p>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={22} color="#8b5cf6" />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>Traceable ML Models</h3>
            <p style={{ fontSize: '0.85rem', color: '#9ca3af', lineHeight: 1.6 }}>
              Test and trace model coefficients, training history, and version tags through our central model registry schema.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '3rem 2rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.04)',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: '#6b7280',
        zIndex: 10
      }}>
        <p>© 2026 SupplyChainIQ Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
