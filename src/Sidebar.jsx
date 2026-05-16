import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Plus,
  LogOut,
  Zap,
  Palette,
  Check,
  ChevronDown,
  Shield,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';

const initials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) : '?';

function ThemeSwitcher() {
  const { theme, setTheme, themes } = useTheme();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 240 });
  const wrapRef = useRef(null);
  const btnRef = useRef(null);
  const popRef = useRef(null);
  const current = themes.find(t => t.id === theme) || themes[0];

  const computePos = () => {
    const b = btnRef.current?.getBoundingClientRect();
    if (!b) return null;
    const width = Math.max(b.width, 240);
    const maxLeft = window.innerWidth - width - 8;
    return {
      top: b.top,
      left: Math.min(Math.max(b.left, 8), Math.max(maxLeft, 8)),
      width,
    };
  };

  const toggle = () => {
    if (open) { setOpen(false); return; }
    const p = computePos();
    if (p) setPos(p);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const p = computePos();
      if (p) setPos(p);
    };
    const onDown = (e) => {
      if (wrapRef.current?.contains(e.target)) return;
      if (popRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  return (
    <div className="theme-switch" ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        className="theme-switch-btn"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Palette size={16} />
        <span className="theme-current-name">{current.label}</span>
        <span className="swatch-row" aria-hidden>
          {current.swatch.map((c, i) => (
            <span key={i} className="swatch-dot" style={{ background: c }} />
          ))}
        </span>
        <ChevronDown size={14} style={{ opacity: 0.7 }} />
      </button>
      {open && createPortal(
        <div
          ref={popRef}
          className="theme-popover theme-popover-floating"
          role="menu"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: pos.width,
            transform: 'translateY(calc(-100% - 8px))',
            right: 'auto',
            bottom: 'auto',
          }}
        >
          {themes.map(t => (
            <button
              key={t.id}
              type="button"
              className={`theme-option ${t.id === theme ? 'active' : ''}`}
              onClick={() => { setTheme(t.id); setOpen(false); }}
              role="menuitemradio"
              aria-checked={t.id === theme}
            >
              <span className="swatch-row" aria-hidden>
                {t.swatch.map((c, i) => (
                  <span key={i} className="swatch-dot" style={{ background: c }} />
                ))}
              </span>
              <span className="theme-meta">
                <div className="theme-name">{t.label}</div>
                <div className="theme-desc">{t.description}</div>
              </span>
              {t.id === theme && <span className="check-mark"><Check size={14} /></span>}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

export default function Sidebar({ view, setView, projects, onNewProject }) {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon" style={{width:32,height:32}}>
          <Zap size={16} fill="currentColor" strokeWidth={0} />
        </div>
        <div className="logo-text" style={{fontSize:18}}>Task<span>Flow</span></div>
      </div>

      <div className="nav-section">
        <div className="nav-label">Main</div>
        <button className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
          <LayoutDashboard className="nav-icon" size={18} />
          <span className="nav-label-text">Dashboard</span>
        </button>
        <button className={`nav-item ${view === 'projects' ? 'active' : ''}`} onClick={() => setView('projects')}>
          <FolderKanban className="nav-icon" size={18} />
          <span className="nav-label-text">Projects</span>
        </button>
        <button className={`nav-item ${view === 'my-tasks' ? 'active' : ''}`} onClick={() => setView('my-tasks')}>
          <CheckSquare className="nav-icon" size={18} />
          <span className="nav-label-text">My Tasks</span>
        </button>
      </div>

      {projects.length > 0 && (
        <div className="nav-section" style={{flex:1}}>
          <div className="nav-label" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span>Projects</span>
            {isAdmin && (
              <button
                onClick={onNewProject}
                style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer',display:'inline-flex',alignItems:'center'}}
                aria-label="New project"
                title="New project"
              >
                <Plus size={14} />
              </button>
            )}
          </div>
          {projects.slice(0,8).map(p => (
            <button key={p.id}
              className={`nav-item ${view === `project-${p.id}` ? 'active' : ''}`}
              onClick={() => setView(`project-${p.id}`)}
              style={{fontSize:13}}
            >
              <span style={{width:6,height:6,borderRadius:'50%',background:'var(--accent)',flexShrink:0,display:'inline-block'}}></span>
              <span className="nav-label-text" style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</span>
            </button>
          ))}
        </div>
      )}

      <div className="sidebar-footer">
        <ThemeSwitcher />
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
          <div className="avatar"><span>{initials(user?.name)}</span></div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:6}}>
              <span style={{overflow:'hidden',textOverflow:'ellipsis'}}>{user?.name}</span>
              <span className={`role-badge ${isAdmin ? 'admin' : ''}`}>
                {isAdmin ? <Shield size={10} /> : <UserIcon size={10} />}
                {isAdmin ? 'Admin' : 'Tasker'}
              </span>
            </div>
            <div style={{fontSize:11,color:'var(--text3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.email}</div>
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm signout-btn"
          style={{width:'100%'}}
          onClick={logout}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut size={14} /> <span className="signout-label">Sign out</span>
        </button>
      </div>
    </div>
  );
}
