import { supabase } from './supabase';

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

const PRIORITY_RANK = { high: 1, medium: 2, low: 3 };

function sortTasks(rows) {
  return [...rows].sort((a, b) => {
    const pr = (PRIORITY_RANK[a.priority] || 99) - (PRIORITY_RANK[b.priority] || 99);
    if (pr !== 0) return pr;
    const ad = a.due_date || '9999-12-31';
    const bd = b.due_date || '9999-12-31';
    return ad.localeCompare(bd);
  });
}

function flattenTask(row) {
  return {
    ...row,
    assignee_name: row.assignee?.name || null,
    creator_name: row.creator?.name || null,
  };
}

// ============ AUTH-RELATED ============

export async function getCurrentProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return unwrap(await supabase.from('profiles').select('id, name, email, role').eq('id', user.id).single());
}

// ============ PROJECTS ============

export async function listProjects(currentUser) {
  const isGlobalAdmin = currentUser?.role === 'admin';

  // 1. Fetch projects + admin name (RLS ensures we only see what we can)
  const projects = unwrap(
    await supabase
      .from('projects')
      .select('id, name, description, admin_id, created_at, admin:profiles!projects_admin_id_fkey(name)')
      .order('created_at', { ascending: false })
  );

  if (projects.length === 0) return [];

  const ids = projects.map((p) => p.id);

  // 2. Member counts + your role per project
  const members = unwrap(
    await supabase
      .from('project_members')
      .select('project_id, user_id, role')
      .in('project_id', ids)
  );

  // 3. Task counts
  const tasks = unwrap(
    await supabase
      .from('tasks')
      .select('project_id')
      .in('project_id', ids)
  );

  const memberCounts = {};
  const myRoleByProject = {};
  for (const m of members) {
    memberCounts[m.project_id] = (memberCounts[m.project_id] || 0) + 1;
    if (m.user_id === currentUser.id) myRoleByProject[m.project_id] = m.role;
  }
  const taskCounts = {};
  for (const t of tasks) {
    taskCounts[t.project_id] = (taskCounts[t.project_id] || 0) + 1;
  }

  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    admin_id: p.admin_id,
    created_at: p.created_at,
    admin_name: p.admin?.name || null,
    member_count: memberCounts[p.id] || 0,
    task_count: taskCounts[p.id] || 0,
    role: myRoleByProject[p.id] || (isGlobalAdmin ? 'admin' : 'member'),
  }));
}

export async function createProject({ name, description }, currentUser) {
  const trimmedName = String(name || '').trim();
  if (!trimmedName) throw new Error('Project name is required');
  if (trimmedName.length > 120) throw new Error('Project name is too long');

  const project = unwrap(
    await supabase
      .from('projects')
      .insert({
        name: trimmedName,
        description: String(description || '').trim(),
        admin_id: currentUser.id,
      })
      .select('id, name, description, admin_id, created_at')
      .single()
  );

  unwrap(
    await supabase
      .from('project_members')
      .insert({ project_id: project.id, user_id: currentUser.id, role: 'admin' })
  );

  return {
    ...project,
    admin_name: currentUser.name,
    member_count: 1,
    task_count: 0,
    role: 'admin',
  };
}

export async function updateProject(projectId, { name, description }) {
  const trimmedName = String(name || '').trim();
  if (!trimmedName) throw new Error('Project name is required');
  const updated = unwrap(
    await supabase
      .from('projects')
      .update({ name: trimmedName, description: String(description || '').trim() })
      .eq('id', projectId)
      .select('id, name, description, admin_id, created_at, admin:profiles!projects_admin_id_fkey(name)')
      .single()
  );
  return { ...updated, admin_name: updated.admin?.name || null };
}

export async function deleteProject(projectId) {
  unwrap(await supabase.from('projects').delete().eq('id', projectId));
}

export async function getProjectDetail(projectId) {
  const project = unwrap(
    await supabase
      .from('projects')
      .select('id, name, description, admin_id, created_at, admin:profiles!projects_admin_id_fkey(name)')
      .eq('id', projectId)
      .single()
  );

  const memberRows = unwrap(
    await supabase
      .from('project_members')
      .select('role, joined_at, profile:profiles!project_members_user_id_fkey(id, name, email)')
      .eq('project_id', projectId)
      .order('joined_at', { ascending: true })
  );

  const members = memberRows.map((m) => ({
    id: m.profile.id,
    name: m.profile.name,
    email: m.profile.email,
    role: m.role,
    joined_at: m.joined_at,
  }));

  return {
    project: { ...project, admin_name: project.admin?.name || null },
    members,
  };
}

export async function addProjectMember(projectId, email) {
  const cleanEmail = email?.toLowerCase().trim();
  if (!cleanEmail) throw new Error('Email required');

  const profile = unwrap(
    await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('email', cleanEmail)
      .maybeSingle()
  );
  if (!profile) throw new Error('User not found. They must sign up first.');

  const existing = unwrap(
    await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', projectId)
      .eq('user_id', profile.id)
      .maybeSingle()
  );
  if (existing) throw new Error('User is already a member');

  unwrap(
    await supabase
      .from('project_members')
      .insert({ project_id: projectId, user_id: profile.id, role: 'member' })
  );

  return { ...profile, role: 'member' };
}

export async function removeProjectMember(projectId, userId) {
  const project = unwrap(
    await supabase.from('projects').select('admin_id').eq('id', projectId).single()
  );
  if (project.admin_id === userId) throw new Error('Cannot remove the project admin');
  unwrap(
    await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId)
  );
}

// ============ TASKS ============

const TASK_SELECT = `
  id, project_id, title, description, due_date, priority, status,
  assignee_id, created_by, created_at, updated_at,
  assignee:profiles!tasks_assignee_id_fkey(name),
  creator:profiles!tasks_created_by_fkey(name)
`;

export async function listProjectTasks(projectId) {
  const rows = unwrap(
    await supabase
      .from('tasks')
      .select(TASK_SELECT)
      .eq('project_id', projectId)
  );
  return sortTasks(rows.map(flattenTask));
}

export async function createTask(projectId, payload, currentUser) {
  const title = String(payload.title || '').trim();
  if (!title) throw new Error('Title is required');

  const insert = {
    project_id: projectId,
    title,
    description: payload.description || null,
    due_date: payload.due_date || null,
    priority: payload.priority || 'medium',
    status: 'todo',
    assignee_id: payload.assignee_id || null,
    created_by: currentUser.id,
  };

  const row = unwrap(
    await supabase.from('tasks').insert(insert).select(TASK_SELECT).single()
  );
  return flattenTask(row);
}

export async function updateTaskFull(taskId, patch) {
  const update = { ...patch };
  if ('due_date' in update && !update.due_date) update.due_date = null;
  if ('assignee_id' in update && !update.assignee_id) update.assignee_id = null;
  const row = unwrap(
    await supabase.from('tasks').update(update).eq('id', taskId).select(TASK_SELECT).single()
  );
  return flattenTask(row);
}

export async function updateTaskStatus(taskId, status) {
  const validStatuses = ['todo', 'in_progress', 'done'];
  if (!validStatuses.includes(status)) throw new Error('Invalid status');
  unwrap(
    await supabase.rpc('update_task_status', { p_task_id: taskId, p_status: status })
  );
  const row = unwrap(
    await supabase.from('tasks').select(TASK_SELECT).eq('id', taskId).single()
  );
  return flattenTask(row);
}

export async function deleteTask(taskId) {
  unwrap(await supabase.from('tasks').delete().eq('id', taskId));
}

// ============ DASHBOARD ============

export async function getDashboard(currentUser) {
  const isGlobalAdmin = currentUser?.role === 'admin';

  const projects = await listProjects(currentUser);
  const projectIds = projects.map((p) => p.id);

  // All tasks the user can see (RLS-filtered: project members + global admin)
  let tasksQuery = supabase.from('tasks').select(`
    id, project_id, title, description, due_date, priority, status,
    assignee_id, created_by, created_at, updated_at,
    assignee:profiles!tasks_assignee_id_fkey(name),
    project:projects!tasks_project_id_fkey(name)
  `);
  if (projectIds.length > 0) tasksQuery = tasksQuery.in('project_id', projectIds);
  else tasksQuery = tasksQuery.in('project_id', ['00000000-0000-0000-0000-000000000000']);
  const allTasks = unwrap(await tasksQuery);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const enriched = allTasks.map((t) => ({
    ...t,
    project_name: t.project?.name || null,
    assignee_name: t.assignee?.name || null,
  }));

  const myTasks = enriched
    .filter((t) => t.assignee_id === currentUser.id)
    .sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'));

  // For taskers, the dashboard is scoped to their tasks only
  const scope = isGlobalAdmin ? enriched : myTasks;

  // Status counts
  const statusCountsMap = {};
  for (const t of scope) statusCountsMap[t.status] = (statusCountsMap[t.status] || 0) + 1;
  const statusCounts = Object.entries(statusCountsMap).map(([status, count]) => ({ status, count }));

  // Priority counts (active only)
  const priorityCountsMap = {};
  for (const t of scope) {
    if (t.status !== 'done') priorityCountsMap[t.priority] = (priorityCountsMap[t.priority] || 0) + 1;
  }
  const priorityCounts = Object.entries(priorityCountsMap).map(([priority, count]) => ({ priority, count }));

  // Overdue
  const overdueTasks = scope
    .filter((t) => t.status !== 'done' && t.due_date && new Date(t.due_date) < today)
    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));

  // Tasks per user
  let tasksPerUser;
  if (isGlobalAdmin) {
    const counts = {};
    for (const t of enriched) {
      if (!t.assignee_id) continue;
      if (!counts[t.assignee_id]) counts[t.assignee_id] = { id: t.assignee_id, name: t.assignee_name || 'Unknown', task_count: 0, done_count: 0 };
      counts[t.assignee_id].task_count += 1;
      if (t.status === 'done') counts[t.assignee_id].done_count += 1;
    }
    tasksPerUser = Object.values(counts).sort((a, b) => b.task_count - a.task_count);
  } else {
    tasksPerUser = myTasks.length > 0
      ? [{ id: currentUser.id, name: currentUser.name, task_count: myTasks.length, done_count: myTasks.filter((t) => t.status === 'done').length }]
      : [];
  }

  // Project summary
  let projectsSummary;
  if (isGlobalAdmin) {
    projectsSummary = projects.map((p) => {
      const pt = enriched.filter((t) => t.project_id === p.id);
      return {
        id: p.id,
        name: p.name,
        total_tasks: pt.length,
        done_tasks: pt.filter((t) => t.status === 'done').length,
        member_count: p.member_count,
      };
    });
  } else {
    projectsSummary = projects.map((p) => {
      const pt = myTasks.filter((t) => t.project_id === p.id);
      return {
        id: p.id,
        name: p.name,
        total_tasks: pt.length,
        done_tasks: pt.filter((t) => t.status === 'done').length,
        member_count: p.member_count,
      };
    });
  }

  return {
    myTasks,
    statusCounts,
    overdueTasks,
    tasksPerUser,
    projects: projectsSummary,
    priorityCounts,
    role: isGlobalAdmin ? 'admin' : 'tasker',
  };
}
