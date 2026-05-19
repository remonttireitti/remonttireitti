-- Tarjoukset: asiakas voi hyväksyä/hylätä, lukea tarjoajien tiedot

create policy "bids: customer update on own project"
  on public.bids
  for update
  using (
    exists (
      select 1 from public.projects pr
      where pr.id = bids.project_id and pr.customer_id = auth.uid()
    )
  );

create policy "profiles: customer read bidders on own project"
  on public.profiles
  for select
  using (
    exists (
      select 1 from public.bids b
      join public.projects p on p.id = b.project_id
      where b.contractor_id = profiles.id and p.customer_id = auth.uid()
    )
  );

create policy "contractors: customer read bidders on own project"
  on public.contractor_profiles
  for select
  using (
    exists (
      select 1 from public.bids b
      join public.projects p on p.id = b.project_id
      where b.contractor_id = contractor_profiles.id and p.customer_id = auth.uid()
    )
  );
