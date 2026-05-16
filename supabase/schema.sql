-- TaskFlow schema for Supabase
-- Run this in: Supabase Dashboard > SQL Editor > New Query
--
-- This script is idempotent: it can be run multiple times safely.
-- It creates tables, RLS policies, helper functions, and an auth trigger
-- that automatically provisions a profile row for every new auth.users entry.

-- ============================================================
-- 1. TABLES
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text unique not null,
  role text not null default 'tasker' check (role in ('admin','tasker')),
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  admin_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin','member')),
  joined_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text default '',
  due_date date,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  status text not null default 'todo' check (status in ('todo','in_progress','done')),
  assignee_id uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tasks_project on public.tasks (project_id);
create index if not exists idx_tasks_assignee on public.tasks (assignee_id);
create index if not exists idx_project_members_user on public.project_members (user_id);

-- ============================================================
-- 2. TRIGGERS
-- ============================================================

-- Auto-create a profile row when a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    'tasker'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Touch updated_at on task changes
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_touch_updated_at on public.tasks;
create trigger tasks_touch_updated_at
  before update on public.tasks
  for each row execute function public.touch_updated_at();

-- ============================================================
-- 3. HELPER FUNCTIONS (SECURITY DEFINER to bypass RLS recursion)
-- ============================================================

create or replace function public.is_global_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_project_member(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.project_members
    where project_id = p_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_project_admin(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.projects
    where id = p_id and admin_id = auth.uid()
  );
$$;

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;

-- profiles
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- projects
drop policy if exists "projects_select" on public.projects;
create policy "projects_select"
  on public.projects for select
  to authenticated
  using (public.is_global_admin() or public.is_project_member(id));

drop policy if exists "projects_insert" on public.projects;
create policy "projects_insert"
  on public.projects for insert
  to authenticated
  with check (admin_id = auth.uid());

drop policy if exists "projects_update" on public.projects;
create policy "projects_update"
  on public.projects for update
  to authenticated
  using (public.is_global_admin() or admin_id = auth.uid())
  with check (public.is_global_admin() or admin_id = auth.uid());

drop policy if exists "projects_delete" on public.projects;
create policy "projects_delete"
  on public.projects for delete
  to authenticated
  using (public.is_global_admin() or admin_id = auth.uid());

-- project_members
drop policy if exists "members_select" on public.project_members;
create policy "members_select"
  on public.project_members for select
  to authenticated
  using (public.is_global_admin() or public.is_project_member(project_id));

drop policy if exists "members_insert" on public.project_members;
create policy "members_insert"
  on public.project_members for insert
  to authenticated
  with check (
    public.is_global_admin()
    or public.is_project_admin(project_id)
    or (
      -- Allow the project creator to insert themselves immediately after creating the project.
      user_id = auth.uid()
      and exists(select 1 from public.projects where id = project_id and admin_id = auth.uid())
    )
  );

drop policy if exists "members_delete" on public.project_members;
create policy "members_delete"
  on public.project_members for delete
  to authenticated
  using (public.is_global_admin() or public.is_project_admin(project_id));

-- tasks
drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select"
  on public.tasks for select
  to authenticated
  using (public.is_global_admin() or public.is_project_member(project_id));

drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert"
  on public.tasks for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and (public.is_global_admin() or public.is_project_member(project_id))
  );

drop policy if exists "tasks_update_admin" on public.tasks;
create policy "tasks_update_admin"
  on public.tasks for update
  to authenticated
  using (public.is_global_admin() or public.is_project_admin(project_id))
  with check (public.is_global_admin() or public.is_project_admin(project_id));

drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_delete"
  on public.tasks for delete
  to authenticated
  using (public.is_global_admin() or public.is_project_admin(project_id));

-- ============================================================
-- 5. RPC: assignees update status without full table update rights
-- ============================================================

create or replace function public.update_task_status(p_task_id uuid, p_status text)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks;
begin
  if p_status not in ('todo','in_progress','done') then
    raise exception 'Invalid status: %', p_status;
  end if;

  select * into v_task from public.tasks where id = p_task_id;
  if not found then
    raise exception 'Task not found';
  end if;

  if not (
    v_task.assignee_id = auth.uid()
    or public.is_project_admin(v_task.project_id)
    or public.is_global_admin()
    or public.is_project_member(v_task.project_id)
  ) then
    raise exception 'Not allowed';
  end if;

  update public.tasks
    set status = p_status, updated_at = now()
    where id = p_task_id
    returning * into v_task;

  return v_task;
end;
$$;

grant execute on function public.update_task_status(uuid, text) to authenticated;
