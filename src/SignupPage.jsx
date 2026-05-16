import { useState } from 'react';
import { Zap } from 'lucide-react';
import { useAuth } from './AuthContext';
import AuthGraphic from './AuthGraphic';

export default function SignupPage({ onNavigate }) {
  const { signup } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const profile = await signup(form.name, form.email, form.password);
      if (!profile) {
        setInfo('Account created. Check your email to confirm before signing in.');
      }
    } catch (err) {
      const message = err?.message || 'Signup failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <AuthGraphic />
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon">
            <Zap size={20} fill="currentColor" strokeWidth={0} />
          </div>
          <div className="logo-text">Task<span>Flow</span></div>
        </div>
        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">Start managing your team tasks</p>
        {error && <div className="error-msg">{error}</div>}
        {info && <div className="error-msg" style={{background:'rgba(34,197,94,0.1)',borderColor:'rgba(34,197,94,0.3)',color:'var(--green)'}}>{info}</div>}
        <form onSubmit={handle}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" type="text" placeholder="Arjun Kumar"
              value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="you@company.com"
              value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="Min. 6 characters"
              value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
          </div>
          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <div className="auth-link">
          Already have an account? <a href="#" onClick={e => { e.preventDefault(); onNavigate('login'); }}>Sign in</a>
        </div>
      </div>
    </div>
  );
}
