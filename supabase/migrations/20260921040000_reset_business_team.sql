-- Run this once after business_profiles exists.
-- This resets only the team membership layer, not laundry data or auth users.

drop trigger if exists business_profiles_owner_membership on public.business_profiles;
drop policy if exists "Members can view their own business team"
  on public.business_members;
drop policy if exists "Members can view their business team"
  on public.business_members;
drop function if exists public.add_business_member_by_email(text, text);
drop function if exists public.get_business_team();
drop function if exists public.get_my_business_role();
drop function if exists public.get_my_business_context();
drop function if exists public.is_business_owner(uuid);
drop function if exists public.is_business_member(uuid);
drop function if exists public.create_owner_membership();
drop table if exists public.business_members cascade;

create table public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'staff' check (role in ('owner', 'admin', 'kasir', 'staff')),
  status text not null default 'active' check (status in ('active', 'invited')),
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create index business_members_user_id_idx on public.business_members(user_id);
alter table public.business_members enable row level security;

create or replace function public.is_business_member(p_business_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_members membership
    where membership.business_id = p_business_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
  );
$$;

create policy "Members can view their own business team"
  on public.business_members for select to authenticated
  using (public.is_business_member(business_members.business_id));

insert into public.business_members (business_id, user_id, role, status)
select profile.id, profile.user_id, 'owner', 'active'
from public.business_profiles profile
on conflict (business_id, user_id) do update
set role = 'owner', status = 'active';

create or replace function public.get_my_business_context()
returns table (
  out_business_id uuid,
  out_business_name text,
  out_role text,
  out_status text
)
language sql stable security definer
set search_path = public
as $$
  select
    membership.business_id,
    profile.business_name,
    membership.role,
    membership.status
  from public.business_members membership
  join public.business_profiles profile
    on profile.id = membership.business_id
  where membership.user_id = auth.uid()
    and membership.status = 'active'
  order by (membership.role = 'owner') desc, membership.created_at
  limit 1;
$$;

create or replace function public.get_business_team()
returns table (
  out_member_id uuid,
  out_user_id uuid,
  out_email text,
  out_role text,
  out_status text,
  out_created_at timestamptz
)
language plpgsql stable security definer
set search_path = public, auth
as $$
declare
  selected_business_id uuid;
begin
  select context.out_business_id
  into selected_business_id
  from public.get_my_business_context() context
  where context.out_role = 'owner'
  limit 1;

  if selected_business_id is null then
    raise exception 'Hanya Owner yang dapat mengelola tim';
  end if;

  return query
  select
    membership.id,
    membership.user_id,
    account.email::text,
    membership.role,
    membership.status,
    membership.created_at
  from public.business_members membership
  join auth.users account on account.id = membership.user_id
  where membership.business_id = selected_business_id
  order by (membership.role = 'owner') desc, membership.created_at;
end;
$$;

create or replace function public.add_business_member_by_email(
  p_email text,
  p_role text default 'staff'
)
returns table (
  out_user_id uuid,
  out_email text,
  out_role text,
  out_status text
)
language plpgsql security definer
set search_path = public, auth
as $$
declare
  selected_business_id uuid;
  selected_user_id uuid;
  selected_email text;
begin
  if nullif(trim(p_email), '') is null
     or p_role not in ('owner', 'admin', 'kasir', 'staff') then
    raise exception 'Email atau role tidak valid';
  end if;

  select context.out_business_id
  into selected_business_id
  from public.get_my_business_context() context
  where context.out_role = 'owner'
  limit 1;

  if selected_business_id is null then
    raise exception 'Hanya Owner yang dapat menambahkan anggota';
  end if;

  select account.id, account.email::text
  into selected_user_id, selected_email
  from auth.users account
  where lower(account.email) = lower(trim(p_email))
  limit 1;

  if selected_user_id is null then
    raise exception 'Akun dengan email tersebut belum terdaftar';
  end if;

  insert into public.business_members (business_id, user_id, role, status)
  values (selected_business_id, selected_user_id, p_role, 'active')
  on conflict (business_id, user_id) do update
  set role = excluded.role, status = 'active';

  return query
  select selected_user_id, selected_email, p_role, 'active'::text;
end;
$$;

create or replace function public.create_owner_membership()
returns trigger
language plpgsql security definer
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

revoke all on function public.is_business_member(uuid) from public;
revoke all on function public.get_my_business_context() from public;
revoke all on function public.get_business_team() from public;
revoke all on function public.add_business_member_by_email(text, text) from public;

grant execute on function public.is_business_member(uuid) to authenticated;
grant execute on function public.get_my_business_context() to authenticated;
grant execute on function public.get_business_team() to authenticated;
grant execute on function public.add_business_member_by_email(text, text) to authenticated;
