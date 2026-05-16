import { useState } from 'react';
import { Plus, FolderKanban, X, CheckSquare, Users } from 'lucide-react';
import { useAuth } from './AuthContext';
import { createProject } from './db';

export default function ProjectsPage({ projects, onProjectCreated, setView, loading }) {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    setError('');
    try {
      const project = await createProject(form, user);
      onProjectCreated(project);
      setShowModal(false);
      setForm({ name: '', description: '' });
      setView(`project-${project.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Projects</div>
          <div className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''} in your workspace</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16}/> New Project
        </button>
      </div>

      <div className="page-body">
        {loading ? (
          <div className="loading"><div className="spinner"/></div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><FolderKanban /></div>
            <div className="empty-title">No projects yet</div>
            <div className="empty-text" style={{marginBottom:20}}>
              Create your first project to start managing tasks
            </div>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={16}/> Create Project
            </button>
          </div>
        ) : (
          <div className="grid-auto">
            {projects.map(p => (
              <div key={p.id} className="project-card" onClick={() => setView(`project-${p.id}`)}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:8}}>
                  <div className="project-name">{p.name}</div>
                  <span className={`badge ${p.role === 'admin' ? 'badge-admin' : 'badge-member'}`}>
                    {p.role === 'admin' ? 'Admin' : 'Member'}
                  </span>
                </div>
                <div className="project-desc">{p.description || 'No description'}</div>
                <div className="project-meta">
                  <div className="project-stats">
                    <span className="project-stat"><CheckSquare size={12}/> <strong>{p.task_count||0}</strong> tasks</span>
                    <span className="project-stat"><Users size={12}/> <strong>{p.member_count||0}</strong> members</span>
                  </div>
                  <span style={{fontSize:11,color:'var(--text3)'}}>
                    {new Date(p.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">New Project</div>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={16}/></button>
            </div>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={submit}>
              <div className="form-group">
                <label className="form-label">Project Name *</label>
                <input className="form-input" placeholder="e.g. Platform Redesign" value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})} required autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" placeholder="Brief description of this project..." value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})} rows={3}/>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
