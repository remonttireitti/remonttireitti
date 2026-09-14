-- Tapahtumaloki: luku/ kirjoitus ilman service role -avainta (fallback)

create policy "project_activity_events: customer read own"
  on public.project_activity_events for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.customer_id = auth.uid()
    )
  );

create policy "project_activity_events: contractor read bid project"
  on public.project_activity_events for select
  using (
    exists (
      select 1 from public.bids b
      where b.project_id = project_id and b.contractor_id = auth.uid()
    )
  );

create policy "project_activity_events: contractor insert own"
  on public.project_activity_events for insert
  with check (
    actor_id = auth.uid()
    and kind = 'contractor'
    and exists (
      select 1 from public.bids b
      where b.project_id = project_id and b.contractor_id = auth.uid()
    )
  );
