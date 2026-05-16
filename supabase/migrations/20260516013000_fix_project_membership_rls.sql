-- ============================================================
-- Migration 2: Fix RLS for project membership
-- File: 20260516013000_fix_project_membership_rls.sql
--
-- Adds:
--   * Helper functions (is_global_admin / is_project_member / is_project_admin)
--     marked SECURITY DEFINER so RLS policies don't recurse on themselves.
--   * auto_add_project_admin() trigger – the project creator is automatically
--     inserted into project_members as 'admin' on project insert.
--     ON CONFLICT DO NOTHING protects against duplicate-membership errors
--     when the client also inserts the admin row manually.
--   * CRUD RLS policies for projects, project_members, and tasks
--     (permissive: any project member can create/edit tasks – tightened in
--     migration 3).
--
-- Idempotent: safe to re-run.
-- ============================================================

-- ============================================================
-- 1. HELPER FUNCTIONS (SECURITY DEFINER bypasses RLS recursion)
-- ============================================================

create or replace function public.is_global_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
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
    select 1 from public.project_members
    where project_id = p_id
      and user_id = auth.uid()
      and role = 'admin'
  ) or exists(
    select 1 from public.projects
    where id = p_id and admin_id = auth.uid()
  );
$$;

-- ============================================================
-- 2. AUTO-ADMIN TRIGGER
--    When a project is inserted, the admin_id is added as a 'admin'
--    project_members row automatically. ON CONFLICT DO NOTHING prevents
--    duplicate-key errors if the client also inserts the row.
-- ============================================================

create or replace function public.auto_add_project_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.admin_id, 'admin')
  on conflict (project_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists projects_auto_add_admin on public.projects;
create trigger projects_auto_add_admin
  after insert on public.projects
  for each row execute function public.auto_add_project_admin();

-- ============================================================
-- 3. PROJECTS POLICIES
-- ============================================================

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
  using       (public.is_global_admin() or admin_id = auth.uid())
  with check  (public.is_global_admin() or admin_id = auth.uid());

drop policy if exists "projects_delete" on public.projects;
create policy "projects_delete"
  on public.projects for delete
  to authenticated
  using (public.is_global_admin() or admin_id = auth.uid());

-- ============================================================
-- 4. PROJECT_MEMBERS POLICIES (permissive – tightened in migration 3)
-- ============================================================

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
      -- The project creator can insert themselves immediately after
      -- creating the project, before the auto-admin trigger / app insert
      -- has had a chance to commit.
      user_id = auth.uid()
      and exists (select 1 from public.projects where id = project_id and admin_id = auth.uid())
    )
  );

drop policy if exists "members_delete" on public.project_members;
create policy "members_delete"
  on public.project_members for delete
  to authenticated
  using (public.is_global_admin() or public.is_project_admin(project_id));

-- ============================================================
-- 5. TASKS POLICIES (permissive – tightened in migration 3)
-- ============================================================

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

drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update"
  on public.tasks for update
  to authenticated
  using       (public.is_global_admin() or public.is_project_member(project_id))
  with check  (public.is_global_admin() or public.is_project_member(project_id));

drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_delete"
  on public.tasks for delete
  to authenticated
  using (public.is_global_admin() or public.is_project_member(project_id));

-- ============================================================
-- 6. ACTIVITY_LOG POLICIES
--    Members can read their projects' activity; inserts are open to any
--    authenticated user but the actor_id must match auth.uid().
-- ============================================================

drop policy if exists "activity_select" on public.activity_log;
create policy "activity_select"
  on public.activity_log for select
  to authenticated
  using (
    project_id is null
    or public.is_global_admin()
    or public.is_project_member(project_id)
  );

drop policy if exists "activity_insert" on public.activity_log;
create policy "activity_insert"
  on public.activity_log for insert
  to authenticated
  with check (
    actor_id = auth.uid()
    and (
      project_id is null
      or public.is_global_admin()
      or public.is_project_member(project_id)
    )
  );
