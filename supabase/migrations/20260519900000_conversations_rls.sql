-- Keskustelujen RLS (viestit olivat jo, conversations puuttui)

create policy "conversations: participants read"
  on public.conversations for select
  using (customer_id = auth.uid() or contractor_id = auth.uid());

create policy "conversations: customer create when bid accepted"
  on public.conversations for insert
  with check (
    customer_id = auth.uid()
    and exists (
      select 1
      from public.projects p
      join public.bids b on b.project_id = p.id
      where p.id = project_id
        and p.customer_id = auth.uid()
        and b.contractor_id = conversations.contractor_id
        and b.status = 'accepted'
    )
  );
