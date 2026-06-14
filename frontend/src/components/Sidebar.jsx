import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Truck, Users, Package,
  BrainCircuit, Activity, LogOut, Database, User, Cpu, Plus
} from 'lucide-react';
import { api } from '../api';

const links = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/logistics', icon: Truck, label: 'Logistics' },
  { to: '/suppliers', icon: Users, label: 'Suppliers' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/predictions', icon: BrainCircuit, label: 'Predictions' },
  { to: '/models', icon: Cpu, label: 'ML Models' },
  { to: '/monitoring', icon: Activity, label: 'Monitoring' },
];

export default function Sidebar({ user, dataset, onLogout, onChangeDataset }) {
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState([]);

  // Fetch user's uploaded datasets list on mount / change
  useEffect(() => {
    if (user && user.email) {
      api.listUserDatasets()
        .then(res => {
          setDatasets(res.datasets || []);
        })
        .catch(err => console.error("Error loading user datasets:", err));
    }
  }, [user, dataset]);

  const handleLogoutClick = () => {
    if (onLogout) onLogout();
    navigate('/');
  };

  const handleDatasetChange = (e) => {
    const value = e.target.value;
    if (value === 'production') {
      onChangeDataset({ filename: 'Production DB (Shared)', dataset_id: null });
    } else {
      const selected = datasets.find(d => d.dataset_id === value);
      if (selected) {
        onChangeDataset({
          filename: `${selected.dataset_name}.csv`,
          dataset_id: selected.dataset_id,
          dataset_type: selected.dataset_type
        });
      }
    }
  };

  const handleNewIngestion = () => {
    onChangeDataset(null);
    navigate('/upload');
  };

  return (
    <nav className="sidebar">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#3b82f6' }}>
          ⚡ SupplyChainIQ
        </h1>
        <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
          AI-Powered Intelligence
        </p>
      </div>

      {/* Dataset Selector / Mode switcher */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Data Source
        </label>
        <select
          value={dataset?.dataset_id || 'production'}
          onChange={handleDatasetChange}
          style={{
            width: '100%',
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#f1f5f9',
            borderRadius: '8px',
            padding: '8px 10px',
            fontSize: '0.8rem',
            fontWeight: 500,
            cursor: 'pointer',
            outline: 'none',
            transition: 'border-color 0.2s'
          }}
        >
          <option value="production">Production DB (Shared)</option>
          {datasets.map(d => (
            <option key={d.dataset_id} value={d.dataset_id}>
              {d.dataset_name} ({d.dataset_type || 'general'})
            </option>
          ))}
        </select>
        
        <button
          onClick={handleNewIngestion}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.15)',
            color: '#3b82f6',
            borderRadius: '6px',
            padding: '6px',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            marginTop: '4px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.target.style.background = 'rgba(59, 130, 246, 0.15)'; }}
          onMouseLeave={(e) => { e.target.style.background = 'rgba(59, 130, 246, 0.08)'; }}
        >
          <Plus size={12} />
          Ingest New Dataset
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '1rem', borderTop: '1px solid #334155' }}>
        {/* User Card */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(30, 41, 59, 0.4)', padding: '8px', borderRadius: '6px' }}>
            <User size={14} color="#94a3b8" />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name}
              </p>
              <p style={{ fontSize: '0.65rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email}
              </p>
            </div>
          </div>
        )}

        {/* Dataset Card */}
        {dataset && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(59, 130, 246, 0.08)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
            <Database size={14} color="#3b82f6" />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#3b82f6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Active Dataset
              </p>
              <p style={{ fontSize: '0.65rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {dataset.filename}
              </p>
            </div>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={handleLogoutClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 14px',
            borderRadius: '8px',
            color: '#ef4444',
            background: 'none',
            border: 'none',
            fontSize: '0.9rem',
            fontWeight: 500,
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}
          onMouseLeave={(e) => e.target.style.background = 'none'}
        >
          <LogOut size={18} />
          Sign Out
        </button>

        <p style={{ fontSize: '0.7rem', color: '#475569', textAlign: 'center' }}>
          SupplyChainIQ • v1.0.0
        </p>
      </div>
    </nav>
  );
}
