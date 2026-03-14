create type public.compliance_control_status as enum (
  'not_started',
  'in_progress',
  'needs_review',
  'compliant',
  'at_risk'
);

create type public.incident_severity as enum ('low', 'medium', 'high', 'critical');
create type public.incident_status as enum ('open', 'investigating', 'contained', 'resolved', 'closed');

create table public.compliance_controls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  control_code text not null,
  title text not null,
  category text not null,
  status public.compliance_control_status not null default 'not_started',
  due_date date,
  owner_membership_id uuid references public.organization_memberships(id) on delete set null,
  evidence_summary text,
  notes text,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, control_code)
);

create table public.incident_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  severity public.incident_severity not null default 'medium',
  status public.incident_status not null default 'open',
  owner_membership_id uuid references public.organization_memberships(id) on delete set null,
  affected_system text,
  summary text not null,
  response_notes text,
  detected_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index compliance_controls_org_due_date_idx
  on public.compliance_controls (organization_id, due_date asc);

create index compliance_controls_org_status_idx
  on public.compliance_controls (organization_id, status);

create index incident_reports_org_detected_at_idx
  on public.incident_reports (organization_id, detected_at desc);

create index incident_reports_org_status_idx
  on public.incident_reports (organization_id, status, severity);

create trigger compliance_controls_set_updated_at
before update on public.compliance_controls
for each row
execute function public.set_updated_at();

create trigger incident_reports_set_updated_at
before update on public.incident_reports
for each row
execute function public.set_updated_at();

alter table public.compliance_controls enable row level security;
alter table public.incident_reports enable row level security;

create policy "privileged users can read compliance controls"
on public.compliance_controls
for select
using (
  public.has_org_role(
    organization_id,
    array['org_admin', 'compliance_manager']::public.app_role[]
  )
);

create policy "privileged users can manage compliance controls"
on public.compliance_controls
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

create policy "privileged users can read incidents"
on public.incident_reports
for select
using (
  public.has_org_role(
    organization_id,
    array['org_admin', 'compliance_manager']::public.app_role[]
  )
);

create policy "privileged users can manage incidents"
on public.incident_reports
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
