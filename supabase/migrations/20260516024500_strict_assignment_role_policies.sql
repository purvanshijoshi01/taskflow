-- ============================================================
-- Migration 3: Strict assignment & role policies
-- File: 20260516024500_strict_assignment_role_policies.sql
--
-- Locks down:
--   * Only project admins (or global admins) can CREATE or DELETE tasks.
--   * Only project admins (or global admins) can manage members
--     (insert/delete project_members rows).
--   * Members can UPDATE only tasks assigned to themselves, and they
--     cannot change a task's project_id, assignee_id, or created_by.
--   * update_task_status() RPC is restricted to the assignee + admins.
--
-- Idempotent: safe to re-run.
-- ============================================================

-- ============================================================
-- 1. TASKS – strict CRUD
-- ============================================================

-- INSERT: only project admins or global admins
drop policy if exists "tasks_insert"        on public.tasks;
drop policy if exists "tasks_insert_admin"  on public.tasks;
create policy "tasks_insert_admin"
  on public.tasks for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and (public.is_global_admin() or public.is_project_admin(project_id))
  );

-- DELETE: only project admins or global admins
drop policy if exists "tasks_delete"        on public.tasks;
drop policy if exists "tasks_delete_admin"  on public.tasks;
create policy "tasks_delete_admin"
  on public.tasks for delete
  to authenticated
  using (public.is_global_admin() or public.is_project_admin(project_id));

-- UPDATE: split into two policies (admin OR assignee). A row passes RLS
-- if either policy's USING + WITH CHECK is satisfied.
drop policy if exists "tasks_update"           on public.tasks;
drop policy if exists "tasks_update_admin"     on public.tasks;
drop policy if exists "tasks_update_assignee"  on public.tasks;

create policy "tasks_update_admin"
  on public.tasks for update
  to authenticated
  using       (public.is_global_admin() or public.is_project_admin(project_id))
  with check  (public.is_global_admin() or public.is_project_admin(project_id));

-- Assignees can update their own task, but cannot reassign it, move it to
-- another project, or change who created it. (The fields they touch in the
-- app are status, description, due_date, priority – all allowed.)
create policy "tasks_update_assignee"
  on public.tasks for update
  to authenticated
  using       (assignee_id = auth.uid())
  with check  (
    assignee_id = auth.uid()
    and project_id  = (select project_id  from public.tasks where id = tasks.id)
    and created_by  = (select created_by  from public.tasks where id = tasks.id)
  );

-- ============================================================
-- 2. PROJECT_MEMBERS – only admins can add/remove members
-- ============================================================

drop policy if exists "members_insert"        on public.project_members;
drop policy if exists "members_insert_admin"  on public.project_members;
create policy "members_insert_admin"
  on public.project_members for insert
  to authenticated
  with check (
    public.is_global_admin()
    or public.is_project_admin(project_id)
    or (
      -- Still allow the project creator's first self-insert (covers the
      -- race window between projects.insert and the auto-admin trigger
      -- when policies are evaluated client-side).
      user_id = auth.uid()
      and exists (select 1 from public.projects where id = project_id and admin_id = auth.uid())
    )
  );

drop policy if exists "members_delete"        on public.project_members;
drop policy if exists "members_delete_admin"  on public.project_members;
create policy "members_delete_admin"
  on public.project_members for delete
  to authenticated
  using (public.is_global_admin() or public.is_project_admin(project_id));

-- ============================================================
-- 3. RPC: update_task_status – restrict to assignee + admins
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
  ) then
    raise exception 'Not allowed to update this task';
  end if;

  update public.tasks
     set status = p_status,
         updated_at = now()
   where id = p_task_id
   returning * into v_task;

  return v_task;
end;
$$;

grant execute on function public.update_task_status(uuid, text) to authenticated;
