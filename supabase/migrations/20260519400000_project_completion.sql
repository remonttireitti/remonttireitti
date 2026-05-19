-- Urakan valmistuminen ja asiakkaan kommentti

alter table public.projects
  add column if not exists completion_notes text,
  add column if not exists completed_at timestamptz;

-- Urakoitsijan keskiarvon luku (julkinen)
create policy "reviews: customer update own"
  on public.reviews for update
  using (auth.uid() = customer_id)
  with check (auth.uid() = customer_id);
