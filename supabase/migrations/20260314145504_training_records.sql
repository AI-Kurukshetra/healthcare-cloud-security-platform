create type public.training_record_status as enum (
  'not_started',
  'in_progress',
  'completed',
  'overdue'
);

create table public.training_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text,
  assigned_user_id uuid not null references public.profiles(user_id) on delete cascade,
  assigned_by uuid references public.profiles(user_id) on delete set null,
  due_date date,
  status public.training_record_status not null default 'not_started',
  completed_at timestamptz,
  completion_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index training_records_org_due_date_idx
  on public.training_records (organization_id, due_date asc);

create index training_records_org_status_idx
  on public.training_records (organization_id, status);

create index training_records_assigned_user_idx
  on public.training_records (assigned_user_id, status, due_date);

create trigger training_records_set_updated_at
before update on public.training_records
for each row
execute function public.set_updated_at();

alter table public.training_records enable row level security;

create policy "privileged users can read training records"
on public.training_records
for select
using (
  public.has_org_role(
    organization_id,
    array['org_admin', 'compliance_manager']::public.app_role[]
  )
);

create policy "privileged users can manage training records"
on public.training_records
for all
using (
  public.has_org_role(
    organization_id,
    array['org_admin', 'compliance_manager']::public.app_role[]
  )
)
with check (
  public.has_org_role(
    organization_id,
    array['org_admin', 'compliance_manager']::public.app_role[]
  )
);

create policy "members can read own training records"
on public.training_records
for select
using (
  assigned_user_id = (select auth.uid())
  and public.is_org_member(organization_id)
);
