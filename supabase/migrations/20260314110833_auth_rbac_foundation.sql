create type public.app_role as enum ('org_admin', 'compliance_manager', 'staff');
create type public.membership_status as enum ('invited', 'active', 'revoked');
create type public.invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  organization_type text not null default 'clinic',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  role public.app_role not null,
  status public.membership_status not null default 'invited',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, user_id)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.app_role not null,
  status public.invitation_status not null default 'pending',
  invited_by uuid references public.profiles(user_id) on delete set null,
  auth_user_id uuid references public.profiles(user_id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references public.profiles(user_id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships memberships
    where memberships.organization_id = target_organization_id
      and memberships.user_id = (select auth.uid())
      and memberships.status = 'active'
  );
$$;

create or replace function public.has_org_role(target_organization_id uuid, allowed_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships memberships
    where memberships.organization_id = target_organization_id
      and memberships.user_id = (select auth.uid())
      and memberships.status = 'active'
      and memberships.role = any(allowed_roles)
  );
$$;

create unique index organization_memberships_one_active_membership_per_user_idx
  on public.organization_memberships (user_id)
  where status = 'active';

create unique index invitations_one_pending_invite_per_org_email_idx
  on public.invitations (organization_id, lower(email))
  where status = 'pending';

create index organization_memberships_org_id_idx on public.organization_memberships (organization_id);
create index invitations_org_id_idx on public.invitations (organization_id);
create index invitations_auth_user_id_idx on public.invitations (auth_user_id);
create index audit_logs_org_created_at_idx on public.audit_logs (organization_id, created_at desc);

create trigger organizations_set_updated_at
before update on public.organizations
for each row
execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger organization_memberships_set_updated_at
before update on public.organization_memberships
for each row
execute function public.set_updated_at();

create trigger invitations_set_updated_at
before update on public.invitations
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, full_name)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (user_id) do update
  set email = excluded.email,
      full_name = coalesce(public.profiles.full_name, excluded.full_name),
      updated_at = timezone('utc', now());

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user_profile();

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.audit_logs enable row level security;

create policy "organizations members can read own org"
on public.organizations
for select
using (public.is_org_member(id));

create policy "profiles users can read own profile"
on public.profiles
for select
using (user_id = (select auth.uid()));

create policy "profiles privileged users can read org roster"
on public.profiles
for select
using (
  exists (
    select 1
    from public.organization_memberships target_membership
    where target_membership.user_id = profiles.user_id
      and target_membership.status = 'active'
      and public.has_org_role(target_membership.organization_id, array['org_admin', 'compliance_manager']::public.app_role[])
  )
);

create policy "profiles users can update own profile"
on public.profiles
for update
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "members can read own membership"
on public.organization_memberships
for select
using (user_id = (select auth.uid()));

create policy "privileged users can read organization memberships"
on public.organization_memberships
for select
using (public.has_org_role(organization_id, array['org_admin', 'compliance_manager']::public.app_role[]));

create policy "privileged users can read invitations"
on public.invitations
for select
using (public.has_org_role(organization_id, array['org_admin', 'compliance_manager']::public.app_role[]));

create policy "privileged users can read audit logs"
on public.audit_logs
for select
using (public.has_org_role(organization_id, array['org_admin', 'compliance_manager']::public.app_role[]));
