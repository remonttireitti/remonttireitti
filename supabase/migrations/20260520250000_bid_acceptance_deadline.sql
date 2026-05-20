-- Viimeistely: asiakas hyväksyy → urakoitsija maksaa määräajassa; muuten diili raukeaa.

create or replace function public.finalize_bid_acceptance(p_project_id uuid, p_winning_bid_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.bids
  set status = 'accepted'
  where id = p_winning_bid_id
    and project_id = p_project_id;

  update public.bids
  set
    status = 'rejected',
    rejection_message = coalesce(
      nullif(trim(rejection_message), ''),
      'Asiakas valitsi toisen urakoitsijan.'
    ),
    rejected_at = coalesce(rejected_at, now())
  where project_id = p_project_id
    and id is distinct from p_winning_bid_id
    and status = 'submitted';
end;
$$;

create or replace function public.mark_platform_invoice_paid(invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.platform_invoices%rowtype;
  win_bid uuid;
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

  select accepted_bid_id into win_bid
  from public.projects
  where id = inv.project_id;

  if win_bid is not null then
    perform public.finalize_bid_acceptance(inv.project_id, win_bid);
  end if;
end;
$$;

grant execute on function public.finalize_bid_acceptance(uuid, uuid) to service_role;

comment on function public.finalize_bid_acceptance is
  'Merkitsee voittanut tarjouksen hyväksytyksi ja hylkää muut submitted-tarjoukset';
