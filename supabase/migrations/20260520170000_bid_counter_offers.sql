-- Asiakkaan vastatarjous urakoitsijan tarjoukseen

alter table public.bids
  add column if not exists counter_amount_cents int,
  add column if not exists counter_message text,
  add column if not exists counter_offered_at timestamptz,
  add column if not exists counter_status text;

alter table public.bids
  drop constraint if exists bids_counter_status_check;

alter table public.bids
  add constraint bids_counter_status_check
  check (
    counter_status is null
    or counter_status in ('pending', 'accepted', 'declined')
  );

comment on column public.bids.counter_amount_cents is 'Asiakkaan vastatarjouksen summa (sentit)';
comment on column public.bids.counter_message is 'Asiakkaan vastatarjouksen viesti';
comment on column public.bids.counter_status is 'pending = odottaa urakoitsijaa, accepted/declined = käsitelty';
