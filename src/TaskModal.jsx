import { useState } from 'react';
import { X, Calendar, AlertTriangle } from 'lucide-react';
import { useAuth } from './AuthContext';
import { updateTaskFull, updateTaskStatus, deleteTask as deleteTaskApi } from './db';

const initials = (name) => name ? name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) : '?';

function formatDate(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}

const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };
const PRIORITY_CLASSES = { high: 'priority-high', medium: 'priority-medium', low: 'priority-low' };

export default function TaskModal({ task, projectId, members, isAdmin, onClose, onUpdated, onDeleted }) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: task.title, description: task.description || '', due_date: task.due_date || '',
    priority: task.priority, status: task.status, assignee_id: task.assignee_id || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isAssignee = task.assignee_id === user?.id;
  const canEdit = isAdmin || isAssignee;

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      let updated;
      if (isAdmin) {
        updated = await updateTaskFull(task.id, {
          title: form.title,
          description: form.description,
          due_date: form.due_date || null,
          priority: form.priority,
          status: form.status,
          assignee_id: form.assignee_id || null,
        });
      } else {
        updated = await updateTaskStatus(task.id, form.status);
      }
      onUpdated(updated);
      setEditing(false);
    } catch (err) {
      setError(err.message || 'Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return;
    try {
      await deleteTaskApi(task.id);
      onDeleted(task.id);
    } catch (err) {
      alert(err.message || 'Failed to delete task');
    }
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{maxWidth:560}}>
        <div className="modal-header">
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span className={`priority-badge ${PRIORITY_CLASSES[task.priority]}`}>{task.priority}</span>
            <div className="modal-title" style={{fontSize:16}}>{editing ? 'Edit Task' : task.title}</div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={16}/></button>
        </div>

        {error && <div className="error-msg">{error}</div>}

        {editing ? (
          <>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} disabled={!isAdmin}/>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} disabled={!isAdmin}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
              {isAdmin && (
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-input" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              )}
            </div>
            {isAdmin && (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input className="form-input" type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Assignee</label>
                  <select className="form-input" value={form.assignee_id} onChange={e => setForm({...form, assignee_id: e.target.value})}>
                    <option value="">Unassigned</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>
            )}
            <div className="modal-actions">
              {isAdmin && <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>}
              <div style={{flex:1}}/>
              <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </>
        ) : (
          <>
            <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:20}}>
              <span style={{padding:'4px 12px',borderRadius:100,fontSize:12,fontWeight:600,
                background: task.status==='done' ? 'rgba(34,197,94,0.15)' : task.status==='in_progress' ? 'rgba(245,158,11,0.15)' : 'rgba(127,127,160,0.15)',
                color: task.status==='done' ? 'var(--green)' : task.status==='in_progress' ? 'var(--yellow)' : 'var(--text3)'
              }}>{STATUS_LABELS[task.status]}</span>
              {task.due_date && (
                <span style={{fontSize:12,color: isOverdue ? 'var(--red)' : 'var(--text2)',display:'flex',alignItems:'center',gap:6}}>
                  <Calendar size={13}/> {formatDate(task.due_date)} {isOverdue && <span style={{display:'inline-flex',alignItems:'center',gap:3}}><AlertTriangle size={12}/> Overdue</span>}
                </span>
              )}
            </div>

            {task.description && (
              <div style={{background:'var(--bg3)',borderRadius:8,padding:'12px 14px',marginBottom:16,fontSize:13,color:'var(--text2)',lineHeight:1.6}}>
                {task.description}
              </div>
            )}

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
              <div>
                <div style={{fontSize:11,color:'var(--text3)',fontWeight:600,textTransform:'uppercase',marginBottom:6}}>Assigned to</div>
                {task.assignee_name ? (
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div className="avatar avatar-sm">{initials(task.assignee_name)}</div>
                    <span style={{fontSize:13}}>{task.assignee_name}</span>
                  </div>
                ) : <span style={{fontSize:13,color:'var(--text3)'}}>Unassigned</span>}
              </div>
              <div>
                <div style={{fontSize:11,color:'var(--text3)',fontWeight:600,textTransform:'uppercase',marginBottom:6}}>Created by</div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div className="avatar avatar-sm">{initials(task.creator_name)}</div>
                  <span style={{fontSize:13}}>{task.creator_name}</span>
                </div>
              </div>
            </div>

            <div style={{fontSize:11,color:'var(--text3)',marginBottom:16}}>
              Created {new Date(task.created_at).toLocaleString()} · Updated {new Date(task.updated_at).toLocaleString()}
            </div>

            {canEdit && (
              <div className="modal-actions">
                {isAdmin && <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete Task</button>}
                <div style={{flex:1}}/>
                <button className="btn btn-primary btn-sm" onClick={() => setEditing(true)}>Edit Task</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
