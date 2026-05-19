-- Markkinapaikan viestit + ilmoitusten vanheneminen

create table public.listing_inquiries (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.equipment_listings (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (listing_id, buyer_id)
);

create table public.listing_messages (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.listing_inquiries (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  check (char_length(body) >= 1 and char_length(body) <= 4000)
);

create index listing_messages_inquiry_idx
  on public.listing_messages (inquiry_id, created_at);

alter table public.listing_inquiries enable row level security;
alter table public.listing_messages enable row level security;

create policy "listing_inquiries: participants read"
  on public.listing_inquiries for select
  using (buyer_id = auth.uid() or seller_id = auth.uid());

create policy "listing_inquiries: buyer create"
  on public.listing_inquiries for insert
  with check (
    buyer_id = auth.uid()
    and exists (
      select 1 from public.equipment_listings el
      where el.id = listing_id
        and el.seller_id = listing_inquiries.seller_id
        and el.status = 'published'
    )
  );

create policy "listing_messages: participants read"
  on public.listing_messages for select
  using (
    exists (
      select 1 from public.listing_inquiries i
      where i.id = inquiry_id
        and (i.buyer_id = auth.uid() or i.seller_id = auth.uid())
    )
  );

create policy "listing_messages: participants insert"
  on public.listing_messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.listing_inquiries i
      where i.id = inquiry_id
        and (i.buyer_id = auth.uid() or i.seller_id = auth.uid())
    )
  );

-- Vanhentuneet ilmoitukset (cron tai lazy-kutsu)
create or replace function public.expire_equipment_listings()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  update public.equipment_listings
  set status = 'expired', updated_at = now()
  where status = 'published'
    and expires_at is not null
    and expires_at < now();

  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on function public.expire_equipment_listings() to authenticated;
grant execute on function public.expire_equipment_listings() to service_role;
