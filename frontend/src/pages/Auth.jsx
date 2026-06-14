import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, User, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setError(null);

    const users = JSON.parse(localStorage.getItem('supplychainiq_users') || '[]');
    const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!foundUser) {
      setError('Account not registered. Please sign up first!');
      return;
    }

    if (foundUser.password !== password) {
      setError('Incorrect password. Please verify credentials.');
      return;
    }

    onLogin(foundUser);
    navigate('/upload');
  };

  const handleSignupSubmit = (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    const users = JSON.parse(localStorage.getItem('supplychainiq_users') || '[]');
    const userExists = users.some(u => u.email.toLowerCase() === email.toLowerCase());

    if (userExists) {
      setError('An account with this email already exists.');
      return;
    }

    const newUser = { name, email, password };
    users.push(newUser);
    localStorage.setItem('supplychainiq_users', JSON.stringify(users));

    setSuccess('Registration successful! Switch to Sign In.');
    setIsLogin(true);
    setPassword('');
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
      {/* Decorative Glow */}
      <div style={{ position: 'absolute', width: '300px', height: '300px', background: 'rgba(59, 130, 246, 0.1)', filter: 'blur(100px)', zIndex: 0 }}></div>

      <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em', background: 'linear-gradient(to right, #fff, #9ca3af)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {isLogin ? 'Sign In' : 'Create Account'}
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '6px' }}>
            {isLogin ? 'Enter credentials to access the console' : 'Register your profile to the database schema'}
          </p>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '10px', color: '#f87171', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '12px', borderRadius: '10px', color: '#34d399', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
            <CheckCircle size={16} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={isLogin ? handleLoginSubmit : handleSignupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!isLogin && (
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: '6px', letterSpacing: '0.025em' }}>FULL NAME</label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="#6b7280" style={{ position: 'absolute', left: 14, top: 14 }} />
                <input
                  className="icon-input"
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', background: 'rgba(3, 7, 18, 0.6)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', borderRadius: '10px', fontSize: '0.9rem' }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: '6px', letterSpacing: '0.025em' }}>EMAIL ADDRESS</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#6b7280" style={{ position: 'absolute', left: 14, top: 14 }} />
              <input
                className="icon-input"
                type="email"
                required
                placeholder="expert@supplychain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '12px 12px 12px 42px', background: 'rgba(3, 7, 18, 0.6)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', borderRadius: '10px', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: '6px', letterSpacing: '0.025em' }}>PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#6b7280" style={{ position: 'absolute', left: 14, top: 14 }} />
              <input
                className="icon-input"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '12px 12px 12px 42px', background: 'rgba(3, 7, 18, 0.6)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', borderRadius: '10px', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          <button type="submit" style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            padding: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            marginTop: '10px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.2)'
          }}>
            {isLogin ? 'Sign In' : 'Sign Up'} <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.75rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '1.25rem' }}>
          <button
            onClick={() => { setIsLogin(!isLogin); setError(null); setSuccess(null); }}
            style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}
          >
            {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Log In'}
          </button>
        </div>
      </div>
    </div>
  );
}
