create type public.security_policy_status as enum ('draft', 'active', 'needs_review', 'retired');

create table public.security_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  policy_name text not null,
  category text not null,
  version text not null default '1.0',
  status public.security_policy_status not null default 'draft',
  effective_date date,
  next_review_date date,
  owner_membership_id uuid references public.organization_memberships(id) on delete set null,
  document_url text,
  summary text,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, policy_name, version)
);

create index security_policies_org_status_idx
  on public.security_policies (organization_id, status);

create index security_policies_org_review_idx
  on public.security_policies (organization_id, next_review_date asc);

create trigger security_policies_set_updated_at
before update on public.security_policies
for each row
execute function public.set_updated_at();

alter table public.security_policies enable row level security;

create policy "privileged users can read security policies"
on public.security_policies
for select
using (
  public.has_org_role(
    organization_id,
    array['org_admin', 'compliance_manager']::public.app_role[]
  )
);

create policy "privileged users can manage security policies"
on public.security_policies
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

