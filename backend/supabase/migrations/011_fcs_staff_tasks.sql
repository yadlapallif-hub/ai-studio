-- 011_fcs_staff_tasks.sql
-- Adds database-backed staff tasks so Admin / Super Admin can assign role tasks to lower levels.

create table if not exists public.fcs_staff_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  assigned_to uuid not null references public.fcs_profiles(id) on delete cascade,
  assigned_by uuid not null references public.fcs_profiles(id) on delete cascade,
  target_role text not null default 'support_agent',
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  due_date date,
  completion_note text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_fcs_staff_tasks_assigned_to
  on public.fcs_staff_tasks(assigned_to, status);

create index if not exists idx_fcs_staff_tasks_assigned_by
  on public.fcs_staff_tasks(assigned_by, created_at desc);

alter table public.fcs_staff_tasks enable row level security;

drop policy if exists "fcs_staff_tasks_read_own_or_admin" on public.fcs_staff_tasks;
create policy "fcs_staff_tasks_read_own_or_admin"
  on public.fcs_staff_tasks
  for select
  using (
    auth.uid() = assigned_to
    or public.fcs_has_any_role(auth.uid(), array['super_admin', 'admin'])
  );

drop policy if exists "fcs_staff_tasks_admin_manage" on public.fcs_staff_tasks;
create policy "fcs_staff_tasks_admin_manage"
  on public.fcs_staff_tasks
  for all
  using (
    public.fcs_has_any_role(auth.uid(), array['super_admin', 'admin'])
  )
  with check (
    public.fcs_has_any_role(auth.uid(), array['super_admin', 'admin'])
  );

drop policy if exists "fcs_staff_tasks_assignee_update" on public.fcs_staff_tasks;
create policy "fcs_staff_tasks_assignee_update"
  on public.fcs_staff_tasks
  for update
  using (auth.uid() = assigned_to)
  with check (auth.uid() = assigned_to);

drop trigger if exists trg_fcs_staff_tasks_updated_at on public.fcs_staff_tasks;
create trigger trg_fcs_staff_tasks_updated_at
  before update on public.fcs_staff_tasks
  for each row execute function public.fcs_set_updated_at();
