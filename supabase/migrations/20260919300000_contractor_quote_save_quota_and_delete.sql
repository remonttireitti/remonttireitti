-- Tallennuskiintiö: muuttumaton ledger + PDF-viennit säilyvät tarjouksen poiston jälkeen.
-- Poisto on kova (hard delete); kiintiö ei palaudu.

-- 1) Ledger: jokainen uusi tallennus kuluttaa kiintiötä; rivi jää poistosta huolimatta.
create table if not exists public.contractor_quote_creation_events (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.contractor_profiles (id) on delete cascade,
  quote_id uuid references public.contractor_quotes (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists contractor_quote_creation_events_month_idx
  on public.contractor_quote_creation_events (contractor_id, created_at desc);

comment on table public.contractor_quote_creation_events is
  'Muuttumaton kirjanpito uusista laskuritarjouksista. Käytetään kk-kiintiöön; ei poisteta tarjouksen hard deleten yhteydessä.';

-- Takaisintäyttö olemassa olevista tarjouksista (yksi event per tarjous).
insert into public.contractor_quote_creation_events (contractor_id, quote_id, created_at)
select q.contractor_id, q.id, q.created_at
from public.contractor_quotes q
where not exists (
  select 1
  from public.contractor_quote_creation_events e
  where e.quote_id = q.id
);

alter table public.contractor_quote_creation_events enable row level security;

create policy "contractor_quote_creation_events: own select"
  on public.contractor_quote_creation_events for select
  using (contractor_id = auth.uid());

create policy "contractor_quote_creation_events: own insert"
  on public.contractor_quote_creation_events for insert
  with check (contractor_id = auth.uid());

create policy "contractor_quote_creation_events: admin read"
  on public.contractor_quote_creation_events for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Ei UPDATE/DELETE -käytäntöjä urakoitsijalle: ledger on muuttumaton sovellustasolla.

-- 2) PDF-vienti: älä CASCADE-poista kun tarjous poistetaan (historia säilyy tilastoihin).
alter table public.contractor_quote_pdf_exports
  alter column quote_id drop not null;

do $$
declare
  fk_name text;
begin
  select tc.constraint_name into fk_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema = kcu.table_schema
  where tc.table_schema = 'public'
    and tc.table_name = 'contractor_quote_pdf_exports'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'quote_id'
  limit 1;

  if fk_name is not null then
    execute format(
      'alter table public.contractor_quote_pdf_exports drop constraint %I',
      fk_name
    );
  end if;
end $$;

alter table public.contractor_quote_pdf_exports
  add constraint contractor_quote_pdf_exports_quote_id_fkey
  foreign key (quote_id)
  references public.contractor_quotes (id)
  on delete set null;
