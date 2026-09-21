-- Team foundation. Membership is deliberately separate from business_profiles so
-- the existing one-business-per-account flow keeps working while teams are added.

create table if not exists public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'staff' check (role in ('owner', 'admin', 'kasir', 'staff')),
  status text not null default 'active' check (status in ('active', 'invited')),
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create index if not exists business_members_user_id_idx on public.business_members(user_id);

alter table public.business_members enable row level security;

create or replace function public.is_business_member(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.business_members
    where business_id = p_business_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

revoke all on function public.is_business_member(uuid) from public;
grant execute on function public.is_business_member(uuid) to authenticated;

-- A member may see memberships for businesses they belong to. Changes are
-- performed through the owner-only SECURITY DEFINER function below.
drop policy if exists "Members can view their business team" on public.business_members;
create policy "Members can view their business team"
  on public.business_members for select to authenticated
  using (public.is_business_member(business_id));

-- Existing business owners become owner members. The NOT EXISTS guard makes
-- this migration safe to run against partially migrated environments.
insert into public.business_members (business_id, user_id, role, status)
select id, user_id, 'owner', 'active'
from public.business_profiles
where user_id is not null
on conflict (business_id, user_id) do update
  set role = 'owner', status = 'active'
  where public.business_members.role = 'owner';

create or replace function public.is_business_owner(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_members
    where business_id = p_business_id
      and user_id = auth.uid()
      and role = 'owner'
      and status = 'active'
  );
$$;

revoke all on function public.is_business_owner(uuid) from public;
grant execute on function public.is_business_owner(uuid) to authenticated;

create or replace function public.get_my_business_role()
returns table (business_id uuid, role text, status text)
language sql
stable
security definer
set search_path = public
as $$
  select bm.business_id, bm.role, bm.status
  from public.business_members bm
  where bm.user_id = auth.uid()
    and bm.status = 'active'
  order by (bm.role = 'owner') desc, bm.created_at
  limit 1;
$$;

revoke all on function public.get_my_business_role() from public;
grant execute on function public.get_my_business_role() to authenticated;

-- auth.users is intentionally never exposed through a table policy. This
-- function returns only the minimum team fields after checking ownership.
create or replace function public.get_business_team()
returns table (
  id uuid,
  user_id uuid,
  email text,
  role text,
  status text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_business_id uuid;
begin
  select r.business_id into v_business_id
  from public.get_my_business_role() r
  where r.role = 'owner'
  limit 1;

  if v_business_id is null then
    raise exception 'Only a business owner can manage the team';
  end if;

  return query
    select bm.id, bm.user_id, u.email::text, bm.role, bm.status, bm.created_at
    from public.business_members bm
    join auth.users u on u.id = bm.user_id
    where bm.business_id = v_business_id
    order by (bm.role = 'owner') desc, bm.created_at;
end;
$$;

revoke all on function public.get_business_team() from public;
grant execute on function public.get_business_team() to authenticated;

create or replace function public.add_business_member_by_email(
  p_email text,
  p_role text default 'staff'
)
returns table (user_id uuid, email text, role text, status text)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_business_id uuid;
  v_user_id uuid;
  v_email text;
begin
  if lower(trim(p_email)) = '' or p_role not in ('owner', 'admin', 'kasir', 'staff') then
    raise exception 'Email or role is invalid';
  end if;

  select r.business_id into v_business_id
  from public.get_my_business_role() r
  where r.role = 'owner'
  limit 1;
  if v_business_id is null then
    raise exception 'Only a business owner can add members';
  end if;

  select u.id, u.email::text into v_user_id, v_email
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1;
  if v_user_id is null then
    raise exception 'No account exists for this email. Ask the person to sign up first.';
  end if;

  insert into public.business_members (business_id, user_id, role, status)
  values (v_business_id, v_user_id, p_role, 'active')
  on conflict (business_id, user_id) do update
    set role = excluded.role, status = 'active';

  return query select v_user_id, v_email, p_role, 'active'::text;
end;
$$;

revoke all on function public.add_business_member_by_email(text, text) from public;
grant execute on function public.add_business_member_by_email(text, text) to authenticated;

-- Keep future onboarding/business creation compatible with the membership model.
create or replace function public.create_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.business_members (business_id, user_id, role, status)
  values (new.id, new.user_id, 'owner', 'active')
  on conflict (business_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists business_profiles_owner_membership on public.business_profiles;
create trigger business_profiles_owner_membership
  after insert on public.business_profiles
  for each row execute function public.create_owner_membership();
