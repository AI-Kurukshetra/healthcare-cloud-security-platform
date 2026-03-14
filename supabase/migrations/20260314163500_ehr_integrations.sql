create type public.ehr_provider as enum ('athenahealth', 'epic', 'cerner', 'other');
create type public.integration_status as enum ('not_connected', 'connected', 'syncing', 'error', 'paused');
create type public.integration_mode as enum ('sandbox', 'production');

create table public.ehr_integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider public.ehr_provider not null,
  mode public.integration_mode not null default 'sandbox',
  status public.integration_status not null default 'not_connected',
  external_tenant_id text,
  sync_frequency_minutes integer not null default 60 check (sync_frequency_minutes >= 15 and sync_frequency_minutes <= 1440),
  last_sync_at timestamptz,
  notes text,
  owner_membership_id uuid references public.organization_memberships(id) on delete set null,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, provider)
);

create index ehr_integrations_org_status_idx
  on public.ehr_integrations (organization_id, status);

create index ehr_integrations_org_provider_idx
  on public.ehr_integrations (organization_id, provider);

create trigger ehr_integrations_set_updated_at
before update on public.ehr_integrations
for each row
execute function public.set_updated_at();

alter table public.ehr_integrations enable row level security;

create policy "privileged users can read ehr integrations"
on public.ehr_integrations
for select
using (
  public.has_org_role(
    organization_id,
    array['org_admin', 'compliance_manager']::public.app_role[]
  )
);

create policy "privileged users can manage ehr integrations"
on public.ehr_integrations
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

