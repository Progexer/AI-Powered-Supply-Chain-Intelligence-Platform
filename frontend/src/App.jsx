import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Layout & Components
import Sidebar from './components/Sidebar';

// Pages
import LandingPage from './pages/LandingPage';
import Auth from './pages/Auth';
import Upload from './pages/Upload';
import Dashboard from './pages/Dashboard';
import Logistics from './pages/Logistics';
import Suppliers from './pages/Suppliers';
import Inventory from './pages/Inventory';
import Predictions from './pages/Predictions';
import Models from './pages/Models';
import Monitoring from './pages/Monitoring';

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('supplychainiq_current_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [dataset, setDataset] = useState(() => {
    const saved = localStorage.getItem('supplychainiq_current_dataset');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (userInfo) => {
    setUser(userInfo);
    localStorage.setItem('supplychainiq_current_user', JSON.stringify(userInfo));
  };

  const handleUpload = (datasetInfo) => {
    setDataset(datasetInfo);
    localStorage.setItem('supplychainiq_current_dataset', JSON.stringify(datasetInfo));
  };

  const handleLogout = () => {
    setUser(null);
    setDataset(null);
    localStorage.removeItem('supplychainiq_current_user');
    localStorage.removeItem('supplychainiq_current_dataset');
  };

  const hasAccess = user && dataset;

  return (
    <Router>
      <div style={{ display: 'flex', width: '100%', minHeight: '100vh' }}>
        
        {/* Render Sidebar ONLY when user is logged in and dataset is selected */}
        {hasAccess && <Sidebar user={user} dataset={dataset} onLogout={handleLogout} onChangeDataset={handleUpload} />}
        
        <main style={{ 
          flex: 1, 
          padding: hasAccess ? '2rem' : '0', 
          marginLeft: hasAccess ? '260px' : '0',
          minHeight: '100vh',
          background: '#0f172a',
          width: '100%'
        }}>
          <Routes>
            {/* Public Pages */}
            <Route path="/" element={hasAccess ? <Navigate to="/dashboard" /> : <LandingPage />} />
            <Route path="/login" element={hasAccess ? <Navigate to="/dashboard" /> : <Auth onLogin={handleLogin} />} />
            
            {/* Intermediate Upload Page (Requires Login) */}
            <Route path="/upload" element={
              user ? (
                dataset ? <Navigate to="/dashboard" /> : <Upload onUpload={handleUpload} />
              ) : (
                <Navigate to="/login" />
              )
            } />

            {/* Authenticated Dashboard Pages */}
            <Route path="/dashboard" element={hasAccess ? <Dashboard dataset={dataset} user={user} /> : <Navigate to="/" />} />
            <Route path="/logistics" element={hasAccess ? <Logistics /> : <Navigate to="/" />} />
            <Route path="/suppliers" element={hasAccess ? <Suppliers dataset={dataset} /> : <Navigate to="/" />} />
            <Route path="/inventory" element={hasAccess ? <Inventory dataset={dataset} /> : <Navigate to="/" />} />
            <Route path="/predictions" element={hasAccess ? <Predictions /> : <Navigate to="/" />} />
            <Route path="/models" element={hasAccess ? <Models /> : <Navigate to="/" />} />
            <Route path="/monitoring" element={hasAccess ? <Monitoring /> : <Navigate to="/" />} />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
