-- Share finance and inventory data with members of the same business.
alter table public.financial_transactions
  add column if not exists business_id uuid references public.business_profiles(id) on delete cascade;
alter table public.inventory_items
  add column if not exists business_id uuid references public.business_profiles(id) on delete cascade;

update public.financial_transactions entry
set business_id = profile.id
from public.business_profiles profile
where entry.business_id is null and entry.user_id = profile.user_id;

update public.inventory_items item
set business_id = profile.id
from public.business_profiles profile
where item.business_id is null and item.user_id = profile.user_id;

drop policy if exists "Users manage their financial transactions" on public.financial_transactions;
drop policy if exists "Users manage their inventory" on public.inventory_items;

create policy "Business members can view financial transactions"
on public.financial_transactions for select to authenticated
using (public.is_business_member(business_id));

create policy "Owners and admins manage financial transactions"
on public.financial_transactions for all to authenticated
using (exists (
  select 1 from public.business_members membership
  where membership.business_id = financial_transactions.business_id
    and membership.user_id = auth.uid()
    and membership.role in ('owner', 'admin')
    and membership.status = 'active'
))
with check (
  user_id = auth.uid()
  and public.is_business_member(business_id)
  and exists (
    select 1 from public.business_members membership
    where membership.business_id = financial_transactions.business_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
      and membership.status = 'active'
  )
);

create policy "Business members can view inventory"
on public.inventory_items for select to authenticated
using (public.is_business_member(business_id));

create policy "Owners and admins manage inventory"
on public.inventory_items for all to authenticated
using (exists (
  select 1 from public.business_members membership
  where membership.business_id = inventory_items.business_id
    and membership.user_id = auth.uid()
    and membership.role in ('owner', 'admin')
    and membership.status = 'active'
))
with check (
  user_id = auth.uid()
  and public.is_business_member(business_id)
  and exists (
    select 1 from public.business_members membership
    where membership.business_id = inventory_items.business_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
      and membership.status = 'active'
  )
);

create index if not exists financial_transactions_business_date_idx
  on public.financial_transactions(business_id, transaction_date desc);
create index if not exists inventory_items_business_name_idx
  on public.inventory_items(business_id, name);
