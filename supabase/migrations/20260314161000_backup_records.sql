create type public.backup_record_status as enum ('scheduled', 'running', 'successful', 'failed', 'paused');

create table public.backup_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  system_name text not null,
  backup_scope text not null,
  status public.backup_record_status not null default 'scheduled',
  last_success_at timestamptz,
  next_scheduled_at timestamptz,
  retention_days integer not null default 30 check (retention_days >= 1 and retention_days <= 3650),
  notes text,
  owner_membership_id uuid references public.organization_memberships(id) on delete set null,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index backup_records_org_status_idx
  on public.backup_records (organization_id, status);

create index backup_records_org_next_schedule_idx
  on public.backup_records (organization_id, next_scheduled_at asc);

create trigger backup_records_set_updated_at
before update on public.backup_records
for each row
execute function public.set_updated_at();

alter table public.backup_records enable row level security;

create policy "privileged users can read backup records"
on public.backup_records
for select
using (
  public.has_org_role(
    organization_id,
    array['org_admin', 'compliance_manager']::public.app_role[]
  )
);

create policy "privileged users can manage backup records"
on public.backup_records
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
