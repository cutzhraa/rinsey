-- Keep an audit trail whenever an order moves through the laundry workflow.
create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  status text not null,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists order_status_history_order_idx
  on public.order_status_history(order_id, created_at desc);

alter table public.order_status_history enable row level security;

drop policy if exists "Business members can view order status history" on public.order_status_history;
create policy "Business members can view order status history"
on public.order_status_history for select to authenticated
using (public.is_business_member(business_id));

create or replace function public.record_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    insert into public.order_status_history (order_id, business_id, status, changed_by)
    values (new.id, new.business_id, new.status, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists orders_status_history_trigger on public.orders;
create trigger orders_status_history_trigger
after insert or update of status on public.orders
for each row execute function public.record_order_status_change();

insert into public.order_status_history (order_id, business_id, status, changed_by, created_at)
select orders.id, orders.business_id, orders.status, orders.user_id, orders.created_at
from public.orders
where orders.business_id is not null
  and not exists (
    select 1
    from public.order_status_history history
    where history.order_id = orders.id
  );
