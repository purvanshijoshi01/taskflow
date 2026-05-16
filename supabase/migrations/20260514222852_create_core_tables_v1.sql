-- ============================================================
-- Migration 1: Core tables + signup trigger
-- File: 20260514222852_create_core_tables_v1.sql
--
-- Creates:
--   * profiles          – one row per auth.users entry
--   * projects          – workspaces owned by an admin
--   * project_members   – join table with role (admin | member)
--   * tasks             – per-project work items
--   * activity_log      – audit trail of actions in the system
--   * handle_new_user() trigger so every signup auto-creates a profile
--
-- Idempotent: safe to re-run.
-- ============================================================

-- Required for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. TABLES
-- ============================================================

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  email      text unique not null,
  role       text not null default 'tasker' check (role in ('admin','tasker')),
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text default '',
  admin_id    uuid not null references public.profiles(id) on delete restrict,
  created_at  timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'member' check (role in ('admin','member')),
  joined_at  timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  title        text not null,
  description  text default '',
  due_date     date,
  priority     text not null default 'medium' check (priority in ('low','medium','high')),
  status       text not null default 'todo'   check (status   in ('todo','in_progress','done')),
  assignee_id  uuid references public.profiles(id) on delete set null,
  created_by   uuid not null references public.profiles(id) on delete restrict,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.projects(id) on delete cascade,
  actor_id    uuid references public.profiles(id) on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- Indexes
create index if not exists idx_tasks_project          on public.tasks (project_id);
create index if not exists idx_tasks_assignee         on public.tasks (assignee_id);
create index if not exists idx_project_members_user   on public.project_members (user_id);
create index if not exists idx_activity_log_project   on public.activity_log (project_id, created_at desc);
create index if not exists idx_activity_log_actor     on public.activity_log (actor_id);

-- ============================================================
-- 2. TOUCH updated_at ON TASK UPDATES
-- ============================================================

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
-- 3. SIGNUP TRIGGER: auto-create profile row for every new auth user
-- ============================================================

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

-- ============================================================
-- 4. ENABLE ROW LEVEL SECURITY (policies added in migrations 2 & 3)
-- ============================================================

alter table public.profiles        enable row level security;
alter table public.projects        enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks           enable row level security;
alter table public.activity_log    enable row level security;

-- Minimal profile policies so the app can read the signed-in user's profile
-- immediately after signup. CRUD policies for the other tables come next.
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
