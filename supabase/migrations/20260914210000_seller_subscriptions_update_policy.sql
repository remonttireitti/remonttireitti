-- Urakoitsija voi päivittää oman tilauksensa ilmoituslaskuria (kk-kiintiö).

create policy "seller_subscriptions: contractor update own"
  on public.seller_subscriptions for update
  using (contractor_id = auth.uid())
  with check (contractor_id = auth.uid());
