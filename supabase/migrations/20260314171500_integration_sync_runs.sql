create type public.integration_sync_run_status as enum ('accepted', 'processing', 'succeeded', 'failed');
create type public.integration_sync_trigger as enum ('manual', 'scheduled', 'retry');

create table public.integration_sync_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  integration_id uuid not null references public.ehr_integrations(id) on delete cascade,
  request_id uuid not null unique,
  provider public.ehr_provider not null,
  trigger public.integration_sync_trigger not null default 'manual',
  run_status public.integration_sync_run_status not null default 'accepted',
  dry_run boolean not null default false,
  requested_at timestamptz not null,
  accepted_at timestamptz not null default timezone('utc', now()),
  source_identifier text,
  telemetry jsonb not null default '{}'::jsonb,
  error_message text,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check ((run_status = 'failed' and error_message is not null) or (run_status <> 'failed')),
  check ((completed_at is not null and run_status in ('succeeded', 'failed')) or (completed_at is null and run_status in ('accepted', 'processing')))
);

create index integration_sync_runs_org_requested_idx
  on public.integration_sync_runs (organization_id, requested_at desc);

create index integration_sync_runs_org_status_idx
  on public.integration_sync_runs (organization_id, run_status);

create index integration_sync_runs_integration_requested_idx
  on public.integration_sync_runs (integration_id, requested_at desc);

create trigger integration_sync_runs_set_updated_at
before update on public.integration_sync_runs
for each row
execute function public.set_updated_at();

alter table public.integration_sync_runs enable row level security;

create policy "privileged users can read integration sync runs"
on public.integration_sync_runs
for select
using (
  public.has_org_role(
    organization_id,
    array['org_admin', 'compliance_manager']::public.app_role[]
  )
);

create policy "privileged users can manage integration sync runs"
on public.integration_sync_runs
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
