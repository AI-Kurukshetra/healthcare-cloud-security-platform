create type public.baa_status as enum ('draft', 'under_review', 'active', 'expired', 'terminated');

create table public.business_associate_agreements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vendor_name text not null,
  contact_email text,
  status public.baa_status not null default 'draft',
  signed_at date,
  renewal_date date,
  document_url text,
  notes text,
  owner_membership_id uuid references public.organization_memberships(id) on delete set null,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index business_associate_agreements_org_status_idx
  on public.business_associate_agreements (organization_id, status);

create index business_associate_agreements_org_renewal_idx
  on public.business_associate_agreements (organization_id, renewal_date asc);

create trigger business_associate_agreements_set_updated_at
before update on public.business_associate_agreements
for each row
execute function public.set_updated_at();

alter table public.business_associate_agreements enable row level security;

create policy "privileged users can read baas"
on public.business_associate_agreements
for select
using (
  public.has_org_role(
    organization_id,
    array['org_admin', 'compliance_manager']::public.app_role[]
  )
);

create policy "privileged users can manage baas"
on public.business_associate_agreements
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
