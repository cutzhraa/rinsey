create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  category text not null,
  description text,
  amount numeric(14, 2) not null check (amount > 0),
  transaction_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  quantity numeric(12, 2) not null default 0 check (quantity >= 0),
  unit text not null default 'pcs',
  min_quantity numeric(12, 2) not null default 0 check (min_quantity >= 0),
  cost_price numeric(14, 2) not null default 0 check (cost_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.financial_transactions enable row level security;
alter table public.inventory_items enable row level security;

create policy "Users manage their financial transactions"
  on public.financial_transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their inventory"
  on public.inventory_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists financial_transactions_user_date_idx
  on public.financial_transactions(user_id, transaction_date desc);

create index if not exists inventory_items_user_name_idx
  on public.inventory_items(user_id, name);
