-- Välitysmaksu hyväksytystä tarjouksesta; yhteystiedot vasta maksun jälkeen

create type public.platform_invoice_status as enum ('pending', 'paid', 'cancelled');

create table public.platform_invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  bid_id uuid not null references public.bids (id) on delete cascade,
  contractor_id uuid not null references public.contractor_profiles (id) on delete cascade,
  amount_cents int not null check (amount_cents > 0),
  vat_rate numeric(5, 2) not null default 25.5,
  status public.platform_invoice_status not null default 'pending',
  due_at timestamptz not null,
  paid_at timestamptz,
  stripe_invoice_id text,
  created_at timestamptz not null default now(),
  unique (bid_id),
  unique (project_id)
);

create index platform_invoices_contractor_idx on public.platform_invoices (contractor_id);
create index platform_invoices_status_idx on public.platform_invoices (status);

alter table public.projects
  add column if not exists accepted_bid_id uuid references public.bids (id) on delete set null,
  add column if not exists contact_revealed_at timestamptz;

-- Yhteystiedot erillisessä taulussa (RLS: vain asiakas tai maksanut urakoitsija)
create table public.project_contacts (
  project_id uuid primary key references public.projects (id) on delete cascade,
  contact_email text not null,
  contact_phone text not null,
  address_line text not null,
  created_at timestamptz not null default now()
);

insert into public.project_contacts (project_id, contact_email, contact_phone, address_line)
select
  id,
  coalesce(contact_email, ''),
  coalesce(contact_phone, ''),
  coalesce(address_line, '')
from public.projects
where contact_email is not null
   or contact_phone is not null
   or address_line is not null
on conflict (project_id) do nothing;

alter table public.project_contacts enable row level security;

create policy "project_contacts: customer read own"
  on public.project_contacts for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_contacts.project_id
        and p.customer_id = auth.uid()
    )
  );

create policy "project_contacts: contractor read when invoice paid"
  on public.project_contacts for select
  using (
    exists (
      select 1 from public.platform_invoices pi
      where pi.project_id = project_contacts.project_id
        and pi.contractor_id = auth.uid()
        and pi.status = 'paid'
    )
  );

-- Urakoitsija näkee omat laskunsa
alter table public.platform_invoices enable row level security;

create policy "platform_invoices: contractor read own"
  on public.platform_invoices for select
  using (contractor_id = auth.uid());

create policy "platform_invoices: customer read on own project"
  on public.platform_invoices for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = platform_invoices.project_id
        and p.customer_id = auth.uid()
    )
  );

create policy "platform_invoices: customer insert on accept"
  on public.platform_invoices for insert
  with check (
    exists (
      select 1 from public.projects p
      where p.id = platform_invoices.project_id
        and p.customer_id = auth.uid()
    )
  );

create policy "project_contacts: customer insert own"
  on public.project_contacts for insert
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_contacts.project_id
        and p.customer_id = auth.uid()
    )
  );

-- Hyväksytty urakoitsija näkee projektin bid_accepted+ tiloissa
drop policy if exists "projects: contractors read published" on public.projects;
create policy "projects: contractors read published"
  on public.projects for select
  using (
    public.is_contractor_user()
    and (
      status in ('published', 'receiving_bids')
      or (
        status in ('bid_accepted', 'in_progress', 'completed')
        and accepted_bid_id is not null
        and exists (
          select 1 from public.bids b
          where b.id = projects.accepted_bid_id
            and b.contractor_id = auth.uid()
        )
      )
    )
  );

-- Merkitse lasku maksetuksi ja paljasta yhteystiedot (kutsutaan server actionista / stripestä)
create or replace function public.mark_platform_invoice_paid(invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.platform_invoices%rowtype;
begin
  select * into inv from public.platform_invoices where id = invoice_id;
  if not found then
    raise exception 'invoice_not_found';
  end if;

  if inv.status = 'paid' then
    return;
  end if;

  if inv.contractor_id is distinct from auth.uid()
    and not exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.role = 'admin'
    ) then
    raise exception 'forbidden';
  end if;

  update public.platform_invoices
  set status = 'paid', paid_at = now()
  where id = invoice_id;

  update public.projects
  set contact_revealed_at = now()
  where id = inv.project_id;
end;
$$;

grant execute on function public.mark_platform_invoice_paid(uuid) to authenticated;

comment on table public.platform_invoices is 'Välityspalkkio kun asiakas hyväksyy tarjouksen';
comment on table public.project_contacts is 'Asiakkaan yhteystiedot; urakoitsija näkee vasta maksetun laskun jälkeen';
