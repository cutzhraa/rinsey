-- Share operational data with members of the same business.
-- This does not remove existing customers, services, or orders.

alter table public.customers add column if not exists business_id uuid references public.business_profiles(id) on delete cascade;
alter table public.services add column if not exists business_id uuid references public.business_profiles(id) on delete cascade;
alter table public.orders add column if not exists business_id uuid references public.business_profiles(id) on delete cascade;

update public.customers customer
set business_id = profile.id
from public.business_profiles profile
where customer.business_id is null
  and customer.user_id = profile.user_id;

update public.services service
set business_id = profile.id
from public.business_profiles profile
where service.business_id is null
  and service.user_id = profile.user_id;

update public.orders order_row
set business_id = profile.id
from public.business_profiles profile
where order_row.business_id is null
  and order_row.user_id = profile.user_id;

drop policy if exists "Users can manage their own customers" on public.customers;
drop policy if exists "Users can manage their own services" on public.services;
drop policy if exists "Users can manage their own orders" on public.orders;

create policy "Business members can view customers"
on public.customers for select to authenticated
using (public.is_business_member(business_id));

create policy "Operators can add customers"
on public.customers for insert to authenticated
with check (
  user_id = auth.uid()
  and public.is_business_member(business_id)
);

create policy "Operators can update customers"
on public.customers for update to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));

create policy "Owners and admins can delete customers"
on public.customers for delete to authenticated
using (
  exists (
    select 1 from public.business_members membership
    where membership.business_id = customers.business_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
      and membership.status = 'active'
  )
);

create policy "Business members can view services"
on public.services for select to authenticated
using (public.is_business_member(business_id));

create policy "Owners and admins can manage services"
on public.services for all to authenticated
using (
  exists (
    select 1 from public.business_members membership
    where membership.business_id = services.business_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
      and membership.status = 'active'
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.business_members membership
    where membership.business_id = services.business_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
      and membership.status = 'active'
  )
);

create policy "Business members can view orders"
on public.orders for select to authenticated
using (public.is_business_member(business_id));

create policy "Operators can add orders"
on public.orders for insert to authenticated
with check (
  user_id = auth.uid()
  and public.is_business_member(business_id)
);

create policy "Business members can update orders"
on public.orders for update to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));

create policy "Owners and admins can delete orders"
on public.orders for delete to authenticated
using (
  exists (
    select 1 from public.business_members membership
    where membership.business_id = orders.business_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
      and membership.status = 'active'
  )
);

create index if not exists customers_business_id_idx on public.customers(business_id);
create index if not exists services_business_id_idx on public.services(business_id);
create index if not exists orders_business_id_created_at_idx on public.orders(business_id, created_at desc);
