// In-memory mock backend for TaskFlow.
// Activated when VITE_USE_MOCK=true in your .env. No Supabase calls are made.
//
// All data lives in module-scope arrays. CRUD operations mutate them so the
// app behaves like a real backend within the session (refresh resets state).

const PRIORITY_RANK = { high: 1, medium: 2, low: 3 };

function uid() {
  return 'm-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function nowIso() {
  return new Date().toISOString();
}

function daysFromNow(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// ============ USERS ============
const USERS = [
  { id: 'u-admin', name: 'Admin User',   email: 'admin@demo.com', role: 'admin',  password: 'demo123' },
  { id: 'u-priya', name: 'Priya Sharma', email: 'priya@demo.com', role: 'tasker', password: 'demo123' },
  { id: 'u-arjun', name: 'Arjun Kumar',  email: 'arjun@demo.com', role: 'tasker', password: 'demo123' },
  { id: 'u-sneha', name: 'Sneha Patel',  email: 'sneha@demo.com', role: 'tasker', password: 'demo123' },
];

// ============ PROJECTS ============
const PROJECTS = [
  { id: 'p-web', name: 'Website Redesign',      description: 'Refresh the marketing site with new branding and faster load times.', admin_id: 'u-admin', created_at: nowIso() },
  { id: 'p-app', name: 'Mobile App Launch',     description: 'Ship the v1 iOS and Android apps to the stores.',                       admin_id: 'u-priya', created_at: nowIso() },
  { id: 'p-mkt', name: 'Q2 Marketing Campaign', description: 'Multi-channel campaign for the spring product push.',                   admin_id: 'u-admin', created_at: nowIso() },
  { id: 'p-dev', name: 'Internal DevTools',     description: 'Build the internal admin console and CI dashboards.',                   admin_id: 'u-arjun', created_at: nowIso() },
];

// ============ MEMBERS ============
const MEMBERS = [
  { project_id: 'p-web', user_id: 'u-admin', role: 'admin',  joined_at: nowIso() },
  { project_id: 'p-web', user_id: 'u-priya', role: 'member', joined_at: nowIso() },
  { project_id: 'p-web', user_id: 'u-sneha', role: 'member', joined_at: nowIso() },

  { project_id: 'p-app', user_id: 'u-priya', role: 'admin',  joined_at: nowIso() },
  { project_id: 'p-app', user_id: 'u-arjun', role: 'member', joined_at: nowIso() },
  { project_id: 'p-app', user_id: 'u-sneha', role: 'member', joined_at: nowIso() },

  { project_id: 'p-mkt', user_id: 'u-admin', role: 'admin',  joined_at: nowIso() },
  { project_id: 'p-mkt', user_id: 'u-sneha', role: 'member', joined_at: nowIso() },

  { project_id: 'p-dev', user_id: 'u-arjun', role: 'admin',  joined_at: nowIso() },
  { project_id: 'p-dev', user_id: 'u-priya', role: 'member', joined_at: nowIso() },
  { project_id: 'p-dev', user_id: 'u-admin', role: 'member', joined_at: nowIso() },
];

// ============ TASKS ============
const TASKS = [
  // Website Redesign
  { id: uid(), project_id: 'p-web', title: 'Finalize new homepage hero', description: 'Approve copy and visuals for the hero section.', due_date: daysFromNow(-2), priority: 'high',   status: 'in_progress', assignee_id: 'u-sneha', created_by: 'u-admin' },
  { id: uid(), project_id: 'p-web', title: 'Migrate blog to new CMS',    description: 'Move 80+ posts and preserve SEO redirects.',     due_date: daysFromNow(7),  priority: 'medium', status: 'todo',        assignee_id: 'u-priya', created_by: 'u-admin' },
  { id: uid(), project_id: 'p-web', title: 'Audit Core Web Vitals',      description: 'Identify LCP/CLS regressions on landing pages.', due_date: daysFromNow(3),  priority: 'high',   status: 'todo',        assignee_id: 'u-sneha', created_by: 'u-admin' },
  { id: uid(), project_id: 'p-web', title: 'Replace stock photography',  description: '',                                                due_date: daysFromNow(-5), priority: 'low',    status: 'done',        assignee_id: 'u-priya', created_by: 'u-admin' },

  // Mobile App Launch
  { id: uid(), project_id: 'p-app', title: 'TestFlight build for v1.0',         description: 'Cut RC1, submit for internal QA.',                  due_date: daysFromNow(1),  priority: 'high',   status: 'in_progress', assignee_id: 'u-arjun', created_by: 'u-priya' },
  { id: uid(), project_id: 'p-app', title: 'Implement push notifications',      description: 'Hook up FCM/APNs and add settings screen toggle.', due_date: daysFromNow(10), priority: 'medium', status: 'todo',        assignee_id: 'u-arjun', created_by: 'u-priya' },
  { id: uid(), project_id: 'p-app', title: 'Write App Store listing copy',      description: '',                                                  due_date: daysFromNow(5),  priority: 'low',    status: 'todo',        assignee_id: 'u-sneha', created_by: 'u-priya' },
  { id: uid(), project_id: 'p-app', title: 'Fix crash on cold start (Android 13)', description: 'Repro: open app from icon after reboot.',        due_date: daysFromNow(-1), priority: 'high',   status: 'in_progress', assignee_id: 'u-arjun', created_by: 'u-priya' },

  // Q2 Marketing Campaign
  { id: uid(), project_id: 'p-mkt', title: 'Draft launch email sequence', description: '3 emails: tease, launch, follow-up.', due_date: daysFromNow(4),  priority: 'medium', status: 'todo', assignee_id: 'u-sneha', created_by: 'u-admin' },
  { id: uid(), project_id: 'p-mkt', title: 'Book influencer partnerships', description: '',                                  due_date: daysFromNow(14), priority: 'low',    status: 'todo', assignee_id: 'u-sneha', created_by: 'u-admin' },
  { id: uid(), project_id: 'p-mkt', title: 'Approve paid ad budget',      description: 'Sign off on $25k across Google + Meta.', due_date: daysFromNow(-3), priority: 'high', status: 'done', assignee_id: 'u-admin', created_by: 'u-admin' },

  // Internal DevTools
  { id: uid(), project_id: 'p-dev', title: 'SSO for admin console',        description: 'Wire up Google Workspace SAML.',         due_date: daysFromNow(6),  priority: 'high',   status: 'in_progress', assignee_id: 'u-arjun', created_by: 'u-arjun' },
  { id: uid(), project_id: 'p-dev', title: 'CI dashboard MVP',             description: 'Show last 50 builds with status + duration.', due_date: daysFromNow(9), priority: 'medium', status: 'todo', assignee_id: 'u-priya', created_by: 'u-arjun' },
  { id: uid(), project_id: 'p-dev', title: 'Rotate database read replica', description: '',                                       due_date: daysFromNow(-4), priority: 'medium', status: 'done', assignee_id: 'u-arjun', created_by: 'u-arjun' },
].map((t) => ({ ...t, created_at: nowIso(), updated_at: nowIso() }));

// ============ SESSION ============
let CURRENT_USER_ID = null;

const delay = (ms = 80) => new Promise((r) => setTimeout(r, ms));
const clone = (x) => JSON.parse(JSON.stringify(x));

function findUser(id) { return USERS.find((u) => u.id === id) || null; }
function findUserByEmail(email) { return USERS.find((u) => u.email === email?.toLowerCase().trim()) || null; }
function publicProfile(u) { if (!u) return null; const { password, ...rest } = u; return rest; }

function sortTasks(rows) {
  return [...rows].sort((a, b) => {
    const pr = (PRIORITY_RANK[a.priority] || 99) - (PRIORITY_RANK[b.priority] || 99);
    if (pr !== 0) return pr;
    return (a.due_date || '9999-12-31').localeCompare(b.due_date || '9999-12-31');
  });
}

function enrichTask(t) {
  return {
    ...t,
    assignee_name: t.assignee_id ? findUser(t.assignee_id)?.name || null : null,
    creator_name: findUser(t.created_by)?.name || null,
  };
}

// ============ AUTH ============
export async function mockSignIn(email, password) {
  await delay();
  const user = findUserByEmail(email);
  if (!user || user.password !== password) throw new Error('Invalid email or password');
  CURRENT_USER_ID = user.id;
  return publicProfile(user);
}

export async function mockSignUp(name, email, password) {
  await delay();
  const cleanEmail = email?.toLowerCase().trim();
  if (findUserByEmail(cleanEmail)) throw new Error('Email already registered');
  if (!password || password.length < 6) throw new Error('Password must be at least 6 characters');
  const user = { id: uid(), name: name?.trim() || cleanEmail.split('@')[0], email: cleanEmail, role: 'tasker', password };
  USERS.push(user);
  CURRENT_USER_ID = user.id;
  return publicProfile(user);
}

export async function mockSignOut() {
  await delay(20);
  CURRENT_USER_ID = null;
}

export async function mockGetSession() {
  return CURRENT_USER_ID ? publicProfile(findUser(CURRENT_USER_ID)) : null;
}

// ============ PROJECTS ============
export async function mockListProjects(currentUser) {
  await delay();
  const isGlobalAdmin = currentUser?.role === 'admin';
  const visible = PROJECTS.filter(
    (p) => isGlobalAdmin || MEMBERS.some((m) => m.project_id === p.id && m.user_id === currentUser.id)
  );

  return visible
    .map((p) => {
      const projectMembers = MEMBERS.filter((m) => m.project_id === p.id);
      const myMembership = projectMembers.find((m) => m.user_id === currentUser.id);
      const admin = findUser(p.admin_id);
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        admin_id: p.admin_id,
        created_at: p.created_at,
        admin_name: admin?.name || null,
        member_count: projectMembers.length,
        task_count: TASKS.filter((t) => t.project_id === p.id).length,
        role: myMembership?.role || (isGlobalAdmin ? 'admin' : 'member'),
      };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function mockCreateProject({ name, description }, currentUser) {
  await delay();
  const trimmed = String(name || '').trim();
  if (!trimmed) throw new Error('Project name is required');
  if (trimmed.length > 120) throw new Error('Project name is too long');

  const project = {
    id: uid(),
    name: trimmed,
    description: String(description || '').trim(),
    admin_id: currentUser.id,
    created_at: nowIso(),
  };
  PROJECTS.unshift(project);
  MEMBERS.push({ project_id: project.id, user_id: currentUser.id, role: 'admin', joined_at: nowIso() });

  return {
    ...project,
    admin_name: currentUser.name,
    member_count: 1,
    task_count: 0,
    role: 'admin',
  };
}

export async function mockUpdateProject(projectId, { name, description }) {
  await delay();
  const trimmed = String(name || '').trim();
  if (!trimmed) throw new Error('Project name is required');
  const project = PROJECTS.find((p) => p.id === projectId);
  if (!project) throw new Error('Project not found');
  project.name = trimmed;
  project.description = String(description || '').trim();
  return { ...project, admin_name: findUser(project.admin_id)?.name || null };
}

export async function mockDeleteProject(projectId) {
  await delay();
  const i = PROJECTS.findIndex((p) => p.id === projectId);
  if (i >= 0) PROJECTS.splice(i, 1);
  for (let j = MEMBERS.length - 1; j >= 0; j--) if (MEMBERS[j].project_id === projectId) MEMBERS.splice(j, 1);
  for (let j = TASKS.length - 1; j >= 0; j--) if (TASKS[j].project_id === projectId) TASKS.splice(j, 1);
}

export async function mockGetProjectDetail(projectId) {
  await delay();
  const project = PROJECTS.find((p) => p.id === projectId);
  if (!project) throw new Error('Project not found');
  const members = MEMBERS.filter((m) => m.project_id === projectId).map((m) => {
    const u = findUser(m.user_id);
    return { id: u.id, name: u.name, email: u.email, role: m.role, joined_at: m.joined_at };
  });
  return {
    project: { ...project, admin_name: findUser(project.admin_id)?.name || null },
    members,
  };
}

export async function mockAddProjectMember(projectId, email) {
  await delay();
  const user = findUserByEmail(email);
  if (!user) throw new Error('User not found. They must sign up first.');
  if (MEMBERS.some((m) => m.project_id === projectId && m.user_id === user.id)) {
    throw new Error('User is already a member');
  }
  const row = { project_id: projectId, user_id: user.id, role: 'member', joined_at: nowIso() };
  MEMBERS.push(row);
  return { id: user.id, name: user.name, email: user.email, role: 'member' };
}

export async function mockRemoveProjectMember(projectId, userId) {
  await delay();
  const project = PROJECTS.find((p) => p.id === projectId);
  if (project?.admin_id === userId) throw new Error('Cannot remove the project admin');
  const i = MEMBERS.findIndex((m) => m.project_id === projectId && m.user_id === userId);
  if (i >= 0) MEMBERS.splice(i, 1);
}

// ============ TASKS ============
export async function mockListProjectTasks(projectId) {
  await delay();
  return sortTasks(TASKS.filter((t) => t.project_id === projectId).map(enrichTask));
}

export async function mockCreateTask(projectId, payload, currentUser) {
  await delay();
  const title = String(payload.title || '').trim();
  if (!title) throw new Error('Title is required');
  const task = {
    id: uid(),
    project_id: projectId,
    title,
    description: payload.description || '',
    due_date: payload.due_date || null,
    priority: payload.priority || 'medium',
    status: 'todo',
    assignee_id: payload.assignee_id || null,
    created_by: currentUser.id,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  TASKS.push(task);
  return enrichTask(task);
}

export async function mockUpdateTaskFull(taskId, patch) {
  await delay();
  const task = TASKS.find((t) => t.id === taskId);
  if (!task) throw new Error('Task not found');
  for (const key of ['title', 'description', 'due_date', 'priority', 'status', 'assignee_id']) {
    if (key in patch) task[key] = patch[key] || (key === 'description' ? '' : null);
  }
  task.updated_at = nowIso();
  return enrichTask(task);
}

export async function mockUpdateTaskStatus(taskId, status) {
  await delay();
  if (!['todo', 'in_progress', 'done'].includes(status)) throw new Error('Invalid status');
  const task = TASKS.find((t) => t.id === taskId);
  if (!task) throw new Error('Task not found');
  task.status = status;
  task.updated_at = nowIso();
  return enrichTask(task);
}

export async function mockDeleteTask(taskId) {
  await delay();
  const i = TASKS.findIndex((t) => t.id === taskId);
  if (i >= 0) TASKS.splice(i, 1);
}

// ============ DASHBOARD ============
export async function mockGetDashboard(currentUser) {
  await delay();
  const isGlobalAdmin = currentUser?.role === 'admin';
  const projects = await mockListProjects(currentUser);
  const projectIds = new Set(projects.map((p) => p.id));

  const allTasks = TASKS.filter((t) => projectIds.has(t.project_id)).map((t) => ({
    ...t,
    project_name: PROJECTS.find((p) => p.id === t.project_id)?.name || null,
    assignee_name: t.assignee_id ? findUser(t.assignee_id)?.name || null : null,
  }));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const myTasks = allTasks
    .filter((t) => t.assignee_id === currentUser.id)
    .sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'));

  const scope = isGlobalAdmin ? allTasks : myTasks;

  const statusCountsMap = {};
  for (const t of scope) statusCountsMap[t.status] = (statusCountsMap[t.status] || 0) + 1;

  const priorityCountsMap = {};
  for (const t of scope) {
    if (t.status !== 'done') priorityCountsMap[t.priority] = (priorityCountsMap[t.priority] || 0) + 1;
  }

  const overdueTasks = scope
    .filter((t) => t.status !== 'done' && t.due_date && new Date(t.due_date) < today)
    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));

  let tasksPerUser;
  if (isGlobalAdmin) {
    const counts = {};
    for (const t of allTasks) {
      if (!t.assignee_id) continue;
      if (!counts[t.assignee_id]) {
        counts[t.assignee_id] = { id: t.assignee_id, name: t.assignee_name || 'Unknown', task_count: 0, done_count: 0 };
      }
      counts[t.assignee_id].task_count += 1;
      if (t.status === 'done') counts[t.assignee_id].done_count += 1;
    }
    tasksPerUser = Object.values(counts).sort((a, b) => b.task_count - a.task_count);
  } else {
    tasksPerUser = myTasks.length > 0
      ? [{ id: currentUser.id, name: currentUser.name, task_count: myTasks.length, done_count: myTasks.filter((t) => t.status === 'done').length }]
      : [];
  }

  const projectsSummary = projects.map((p) => {
    const pt = (isGlobalAdmin ? allTasks : myTasks).filter((t) => t.project_id === p.id);
    return {
      id: p.id,
      name: p.name,
      total_tasks: pt.length,
      done_tasks: pt.filter((t) => t.status === 'done').length,
      member_count: p.member_count,
    };
  });

  return {
    myTasks: clone(myTasks),
    statusCounts: Object.entries(statusCountsMap).map(([status, count]) => ({ status, count })),
    overdueTasks: clone(overdueTasks),
    tasksPerUser,
    projects: projectsSummary,
    priorityCounts: Object.entries(priorityCountsMap).map(([priority, count]) => ({ priority, count })),
    role: isGlobalAdmin ? 'admin' : 'tasker',
  };
}

export const MOCK_DEMO_CREDENTIALS = USERS.map((u) => ({ email: u.email, password: u.password, role: u.role }));
