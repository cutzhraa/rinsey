create table if not exists public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  business_name text not null,
  whatsapp text,
  address text,
  opening_hours text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.business_profiles enable row level security;

create policy "Users can manage their own business profile"
  on public.business_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
