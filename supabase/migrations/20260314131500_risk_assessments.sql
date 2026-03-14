create type public.risk_assessment_status as enum ('identified', 'mitigating', 'accepted', 'closed');

create table public.risk_assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  category text not null,
  likelihood smallint not null check (likelihood between 1 and 5),
  impact smallint not null check (impact between 1 and 5),
  risk_score integer generated always as (likelihood * impact) stored,
  status public.risk_assessment_status not null default 'identified',
  owner_membership_id uuid references public.organization_memberships(id) on delete set null,
  mitigation_plan text,
  target_date date,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index risk_assessments_org_score_idx
  on public.risk_assessments (organization_id, risk_score desc, target_date asc);

create index risk_assessments_org_status_idx
  on public.risk_assessments (organization_id, status);

create trigger risk_assessments_set_updated_at
before update on public.risk_assessments
for each row
execute function public.set_updated_at();

alter table public.risk_assessments enable row level security;

create policy "privileged users can read risks"
on public.risk_assessments
for select
using (
  public.has_org_role(
    organization_id,
    array['org_admin', 'compliance_manager']::public.app_role[]
  )
);

create policy "privileged users can manage risks"
on public.risk_assessments
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
