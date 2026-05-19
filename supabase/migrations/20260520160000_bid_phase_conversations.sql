-- Keskustelut jo tarjousvaiheessa (ennen tarjouksen hyväksyntää)

create policy "conversations: contractor create during bidding"
  on public.conversations for insert
  with check (
    contractor_id = auth.uid()
    and exists (
      select 1
      from public.projects p
      where p.id = project_id
        and p.status in ('published', 'receiving_bids')
    )
  );

create policy "conversations: customer create during bidding"
  on public.conversations for insert
  with check (
    customer_id = auth.uid()
    and exists (
      select 1
      from public.projects p
      where p.id = project_id
        and p.customer_id = auth.uid()
        and p.status in ('published', 'receiving_bids')
    )
  );
