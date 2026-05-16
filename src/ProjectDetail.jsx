import { useState, useEffect } from 'react';
import {
  Pencil,
  Plus,
  X,
  UserPlus,
  Calendar,
  LayoutGrid,
  List as ListIcon,
  Users,
  CheckSquare,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from './AuthContext';
import TaskModal from './TaskModal';
import {
  getProjectDetail,
  listProjectTasks,
  createTask,
  addProjectMember,
  removeProjectMember,
  updateProject,
} from './db';

const initials = (name) => name ? name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) : '?';

const PRIORITY_CLASSES = { high: 'priority-high', medium: 'priority-medium', low: 'priority-low' };

function formatDate(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function ProjectDetail({ projectId, setView, onProjectUpdated }) {
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('board');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [addMemberError, setAddMemberError] = useState('');
  const [taskForm, setTaskForm] = useState({ title:'', description:'', due_date:'', priority:'medium', assignee_id:'' });
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskError, setTaskError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [showEditProject, setShowEditProject] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [editingProject, setEditingProject] = useState(false);
  const [editProjectError, setEditProjectError] = useState('');
  const [toast, setToast] = useState(null);

  const isProjectAdmin = project?.admin_id === user?.id;
  const isAdmin = isProjectAdmin || user?.role === 'admin';
  const canCreateTask = true;

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([getProjectDetail(projectId), listProjectTasks(projectId)])
      .then(([detail, tasksList]) => {
        if (!active) return;
        setProject(detail.project);
        setMembers(detail.members);
        setTasks(tasksList);
      })
      .catch((err) => {
        console.error(err);
        if (active) setView('projects');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId, setView]);

  const submitNewTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;
    setCreatingTask(true);
    setTaskError('');
    try {
      const payload = {
        title: taskForm.title,
        description: taskForm.description,
        due_date: taskForm.due_date || null,
        priority: taskForm.priority,
        assignee_id: isAdmin ? (taskForm.assignee_id || null) : user.id,
      };
      const task = await createTask(projectId, payload, user);
      setTasks((prev) => [...prev, task]);
      setShowNewTask(false);
      setTaskForm({ title:'', description:'', due_date:'', priority:'medium', assignee_id:'' });
    } catch (err) {
      setTaskError(err.message || 'Failed to create task');
    } finally {
      setCreatingTask(false);
    }
  };

  const submitAddMember = async (e) => {
    e.preventDefault();
    setAddMemberError('');
    try {
      const member = await addProjectMember(projectId, newMemberEmail);
      setMembers((prev) => [...prev, member]);
      setNewMemberEmail('');
      setShowAddMember(false);
    } catch (err) {
      setAddMemberError(err.message || 'Failed to add member');
    }
  };

  const removeMember = async (uid) => {
    if (!confirm('Remove this member?')) return;
    try {
      await removeProjectMember(projectId, uid);
      setMembers((prev) => prev.filter((m) => m.id !== uid));
    } catch (err) {
      alert(err.message || 'Failed to remove member');
    }
  };

  const handleTaskUpdated = (updated) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setSelectedTask(updated);
  };

  const handleTaskDeleted = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setSelectedTask(null);
  };

  const openEditProject = () => {
    setEditProjectError('');
    setEditForm({
      name: project?.name || '',
      description: project?.description || '',
    });
    setShowEditProject(true);
  };

  const saveProjectChanges = async (e) => {
    e.preventDefault();
    const trimmedName = editForm.name.trim();

    if (!trimmedName) {
      setEditProjectError('Project name cannot be empty');
      return;
    }

    setEditingProject(true);
    setEditProjectError('');

    try {
      const updated = await updateProject(projectId, {
        name: trimmedName,
        description: editForm.description.trim(),
      });
      setProject(updated);
      onProjectUpdated?.(updated);
      setShowEditProject(false);
      setToast({ type: 'success', message: 'Project updated successfully' });
    } catch (err) {
      const errorMsg = err.message || 'Failed to update project';
      setEditProjectError(errorMsg);
      setToast({ type: 'error', message: errorMsg });
    } finally {
      setEditingProject(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterAssignee && t.assignee_id !== filterAssignee) return false;
    return true;
  });

  const byStatus = (s) => filteredTasks.filter((t) => t.status === s);
  const pct = tasks.length ? Math.round((tasks.filter((t) => t.status === 'done').length / tasks.length) * 100) : 0;

  if (loading) return <div className="loading"><div className="spinner"/></div>;
  if (!project) return null;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <button onClick={() => setView('projects')}>Projects</button>
            <span>›</span>
            <span style={{color:'var(--text2)'}}>{project.name}</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div className="page-title">{project.name}</div>
            {isAdmin && (
              <button
                className="project-edit-btn"
                onClick={openEditProject}
                aria-label="Edit Project"
                title="Edit Project"
                type="button"
              >
                <Pencil size={14} />
                <span className="project-edit-tooltip">Edit Project</span>
              </button>
            )}
          </div>
          {project.description && <div className="page-subtitle">{project.description}</div>}
          <div style={{display:'flex',alignItems:'center',gap:16,marginTop:10}}>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              {members.slice(0,5).map((m) => (
                <div key={m.id} className="avatar avatar-sm" title={m.name}>{initials(m.name)}</div>
              ))}
              {members.length > 5 && <span style={{fontSize:12,color:'var(--text3)'}}>+{members.length-5}</span>}
            </div>
            <span style={{fontSize:13,color:'var(--text2)'}}>{tasks.length} tasks · {pct}% done</span>
          </div>
        </div>
        <div style={{display:'flex',gap:10}}>
          {isAdmin && (
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAddMember(true)}>
              <UserPlus size={14}/> Member
            </button>
          )}
          {canCreateTask && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowNewTask(true)}>
              <Plus size={14}/> Task
            </button>
          )}
        </div>
      </div>

      <div className="page-body">
        <div style={{marginBottom:20}}>
          <div className="progress-bar" style={{height:8}}>
            <div className="progress-fill" style={{width:`${pct}%`}}/>
          </div>
        </div>

        <div style={{display:'flex',gap:4,marginBottom:20,borderBottom:'1px solid var(--border)',paddingBottom:1}}>
          {[
            { key: 'board', label: 'Board', Icon: LayoutGrid },
            { key: 'list', label: 'List', Icon: ListIcon },
            { key: 'members', label: 'Members', Icon: Users },
          ].map(({ key, label, Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              style={{padding:'8px 14px',border:'none',background:'none',cursor:'pointer',fontSize:13,fontWeight:500,
                color: tab===key ? 'var(--accent)' : 'var(--text2)',
                borderBottom: tab===key ? '2px solid var(--accent)' : '2px solid transparent',
                transition:'all 0.2s',display:'inline-flex',alignItems:'center',gap:6
              }}>
              <Icon size={14}/> {label}
            </button>
          ))}
        </div>

        {(tab === 'board' || tab === 'list') && (
          <div className="filter-bar">
            <select className="form-input" style={{width:'auto',fontSize:13,padding:'7px 12px'}} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
            <select className="form-input" style={{width:'auto',fontSize:13,padding:'7px 12px'}} value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
              <option value="">All Assignees</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            {(filterStatus || filterAssignee) && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setFilterStatus(''); setFilterAssignee(''); }}>Clear</button>
            )}
          </div>
        )}

        {tab === 'board' && (
          <div className="board-columns">
            {[
              {key:'todo', label:'To Do', cls:'col-todo'},
              {key:'in_progress', label:'In Progress', cls:'col-inprogress'},
              {key:'done', label:'Done', cls:'col-done'},
            ].map(col => (
              <div key={col.key} className={`board-column ${col.cls}`}>
                <div className="column-header">
                  <div className="column-title">
                    <div className="column-dot"/>
                    {col.label}
                  </div>
                  <div className="column-count">{byStatus(col.key).length}</div>
                </div>
                <div className="column-body">
                  {byStatus(col.key).length === 0 ? (
                    <div style={{textAlign:'center',padding:'20px 10px',color:'var(--text3)',fontSize:12}}>No tasks</div>
                  ) : byStatus(col.key).map(task => {
                    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
                    return (
                      <div key={task.id} className="task-card" onClick={() => setSelectedTask(task)}>
                        <div className="task-title">{task.title}</div>
                        {task.description && <div className="task-desc">{task.description}</div>}
                        <div className="task-footer">
                          <span className={`priority-badge ${PRIORITY_CLASSES[task.priority]}`}>{task.priority}</span>
                          <div style={{display:'flex',gap:8,alignItems:'center'}}>
                            {task.due_date && (
                              <span className={`due-date ${isOverdue?'overdue':''}`}>
                                <Calendar size={11}/> {formatDate(task.due_date)}
                              </span>
                            )}
                            {task.assignee_name && (
                              <div className="assignee-chip">
                                <div className="avatar" style={{width:20,height:20,fontSize:9}}>{initials(task.assignee_name)}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'list' && (
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            {filteredTasks.length === 0 ? (
              <div className="empty-state" style={{padding:'40px 20px'}}>
                <div className="empty-icon"><CheckSquare /></div>
                <div className="empty-title">No tasks found</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Assignee</th>
                    <th>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map(t => {
                    const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done';
                    return (
                      <tr key={t.id} style={{cursor:'pointer'}} onClick={() => setSelectedTask(t)}>
                        <td style={{color:'var(--text)',fontWeight:500}}>{t.title}</td>
                        <td>
                          <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:100,
                            background: t.status==='done'?'rgba(34,197,94,0.15)':t.status==='in_progress'?'rgba(245,158,11,0.15)':'rgba(90,90,122,0.15)',
                            color: t.status==='done'?'var(--green)':t.status==='in_progress'?'var(--yellow)':'var(--text3)'
                          }}>{t.status==='in_progress'?'In Progress':t.status==='done'?'Done':'To Do'}</span>
                        </td>
                        <td><span className={`priority-badge ${PRIORITY_CLASSES[t.priority]}`}>{t.priority}</span></td>
                        <td>
                          {t.assignee_name ? (
                            <div style={{display:'flex',alignItems:'center',gap:6}}>
                              <div className="avatar" style={{width:22,height:22,fontSize:9}}>{initials(t.assignee_name)}</div>
                              {t.assignee_name}
                            </div>
                          ) : <span style={{color:'var(--text3)'}}>—</span>}
                        </td>
                        <td style={{color: isOverdue ? 'var(--red)' : 'var(--text2)'}}>
                          <span style={{display:'inline-flex',alignItems:'center',gap:6}}>
                            {t.due_date ? formatDate(t.due_date) : '—'}
                            {isOverdue && <AlertTriangle size={12} />}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'members' && (
          <div className="card">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <span style={{fontWeight:600}}>{members.length} members</span>
              {isAdmin && (
                <button className="btn btn-primary btn-sm" onClick={() => setShowAddMember(true)}>
                  <UserPlus size={14}/> Add Member
                </button>
              )}
            </div>
            {members.map(m => (
              <div key={m.id} className="member-row">
                <div className="member-info">
                  <div className="avatar">{initials(m.name)}</div>
                  <div>
                    <div style={{fontSize:14,fontWeight:500,color:'var(--text)'}}>{m.name} {m.id===user?.id && <span style={{fontSize:11,color:'var(--text3)'}}>(you)</span>}</div>
                    <div style={{fontSize:12,color:'var(--text3)'}}>{m.email}</div>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <span className={`badge ${m.id===project.admin_id?'badge-admin':'badge-member'}`}>{m.id===project.admin_id?'Admin':'Member'}</span>
                  {isAdmin && m.id !== user?.id && m.id !== project.admin_id && (
                    <button className="btn btn-danger btn-sm" onClick={() => removeMember(m.id)}>Remove</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedTask && (
        <TaskModal task={selectedTask} projectId={projectId} members={members} isAdmin={isAdmin}
          onClose={() => setSelectedTask(null)} onUpdated={handleTaskUpdated} onDeleted={handleTaskDeleted}/>
      )}

      {showNewTask && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowNewTask(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">New Task</div>
              <button className="modal-close" onClick={() => setShowNewTask(false)}><X size={16}/></button>
            </div>
            {taskError && <div className="error-msg">{taskError}</div>}
            <form onSubmit={submitNewTask}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" placeholder="Task title" value={taskForm.title}
                  onChange={e => setTaskForm({...taskForm, title: e.target.value})} required autoFocus/>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" placeholder="Optional description..." value={taskForm.description}
                  onChange={e => setTaskForm({...taskForm, description: e.target.value})} rows={3}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-input" value={taskForm.priority} onChange={e => setTaskForm({...taskForm, priority: e.target.value})}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input className="form-input" type="date" value={taskForm.due_date}
                    onChange={e => setTaskForm({...taskForm, due_date: e.target.value})}/>
                </div>
              </div>
              {isAdmin ? (
                <div className="form-group">
                  <label className="form-label">Assignee</label>
                  <select className="form-input" value={taskForm.assignee_id} onChange={e => setTaskForm({...taskForm, assignee_id: e.target.value})}>
                    <option value="">Unassigned</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              ) : (
                <div style={{fontSize:12,color:'var(--text3)',marginBottom:8}}>
                  This task will be assigned to you.
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowNewTask(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creatingTask}>{creatingTask ? 'Creating...' : 'Create Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddMember && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowAddMember(false)}>
          <div className="modal" style={{maxWidth:380}}>
            <div className="modal-header">
              <div className="modal-title">Add Member</div>
              <button className="modal-close" onClick={() => setShowAddMember(false)}><X size={16}/></button>
            </div>
            {addMemberError && <div className="error-msg">{addMemberError}</div>}
            <form onSubmit={submitAddMember}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-input" type="email" placeholder="member@company.com"
                  value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)} required autoFocus/>
                <div style={{fontSize:12,color:'var(--text3)',marginTop:6}}>User must be registered on TaskFlow</div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddMember(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Member</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditProject && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowEditProject(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Edit Project</div>
              <button className="modal-close" onClick={() => setShowEditProject(false)}><X size={16}/></button>
            </div>
            {editProjectError && <div className="error-msg">{editProjectError}</div>}
            <form onSubmit={saveProjectChanges}>
              <div className="form-group">
                <label className="form-label">Project Name *</label>
                <input
                  className="form-input"
                  placeholder="Project name"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Project Description</label>
                <textarea
                  className="form-input"
                  placeholder="Project description..."
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowEditProject(false)} disabled={editingProject}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={editingProject}>
                  {editingProject ? (
                    <span className="btn-loading">
                      <span className="spinner spinner-inline" aria-hidden />
                      Saving...
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast toast-${toast.type}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      )}
    </>
  );
}
