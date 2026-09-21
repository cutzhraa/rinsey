-- Add an optional estimated completion date to laundry orders.
alter table public.orders
  add column if not exists estimated_completion_date date;

create index if not exists orders_estimated_completion_date_idx
  on public.orders(estimated_completion_date);
