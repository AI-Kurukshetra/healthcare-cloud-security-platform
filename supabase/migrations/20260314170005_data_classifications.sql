create type public.data_classification_level as enum ('public', 'internal', 'confidential', 'phi_restricted');

create table public.data_classifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_name text not null,
  data_type text not null,
  classification_level public.data_classification_level not null default 'internal',
  contains_phi boolean not null default false,
  contains_pii boolean not null default false,
  encryption_required boolean not null default true,
  retention_days integer check (retention_days is null or (retention_days >= 1 and retention_days <= 3650)),
  owner_membership_id uuid references public.organization_memberships(id) on delete set null,
  notes text,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, asset_name)
);

create index data_classifications_org_level_idx
  on public.data_classifications (organization_id, classification_level);

create index data_classifications_org_phi_idx
  on public.data_classifications (organization_id, contains_phi, encryption_required);

create trigger data_classifications_set_updated_at
before update on public.data_classifications
for each row
execute function public.set_updated_at();

alter table public.data_classifications enable row level security;

create policy "privileged users can read data classifications"
on public.data_classifications
for select
using (
  public.has_org_role(
    organization_id,
    array['org_admin', 'compliance_manager']::public.app_role[]
  )
);

create policy "privileged users can manage data classifications"
on public.data_classifications
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

