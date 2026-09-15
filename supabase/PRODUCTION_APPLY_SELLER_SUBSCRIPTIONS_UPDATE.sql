-- Remonttireitti: aja KERRAN tuotanto-Supabasessa (SQL Editor → Run)

drop policy if exists "seller_subscriptions: contractor update own"
  on public.seller_subscriptions;

create policy "seller_subscriptions: contractor update own"
  on public.seller_subscriptions for update
  using (contractor_id = auth.uid())
  with check (contractor_id = auth.uid());
