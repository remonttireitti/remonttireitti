-- Tarjouksen elinkaaritila: Luonnos → Valmis lähetettäväksi → Lähetetty → Tilattu / Hylätty
-- Korvaa aiemman draft|finalized + erillisen outcome-näytön epäselvät "Odottaa"/"Tallennettu"-tunnisteet.

alter table public.contractor_quotes
  drop constraint if exists contractor_quotes_status_check;

-- Migroi olemassa data uuteen malliin ennen constraintia.
update public.contractor_quotes
set status = case
  when outcome = 'won' then 'ordered'
  when outcome = 'lost' then 'rejected'
  when pdf_generated_at is not null then 'sent'
  when status = 'finalized' then 'ready'
  when status = 'draft' then 'draft'
  else 'draft'
end
where status in ('draft', 'finalized')
   or status not in ('draft', 'ready', 'sent', 'ordered', 'rejected');

alter table public.contractor_quotes
  alter column status set default 'draft';

alter table public.contractor_quotes
  add constraint contractor_quotes_status_check
  check (status in ('draft', 'ready', 'sent', 'ordered', 'rejected'));

comment on column public.contractor_quotes.status is
  'Elinkaari: draft=Luonnos, ready=Valmis lähetettäväksi, sent=Lähetetty (odottaa asiakasta), ordered=Tilattu, rejected=Hylätty. outcome-sarake pidetään synkassa tilastoja varten.';

-- Pidä outcome synkassa status-kentän kanssa (vanhat kyselyt / tilastot).
update public.contractor_quotes
set
  outcome = case
    when status = 'ordered' then 'won'
    when status = 'rejected' then 'lost'
    else 'pending'
  end,
  outcome_updated_at = case
    when status in ('ordered', 'rejected') then coalesce(outcome_updated_at, updated_at, now())
    else null
  end;

create index if not exists contractor_quotes_status_idx
  on public.contractor_quotes (contractor_id, status);
