-- Beta: salli 0 € välityspalkkio (ensimmäiset N hyväksyttyä diiliä)

alter table public.platform_invoices
  drop constraint if exists platform_invoices_amount_cents_check;

alter table public.platform_invoices
  add constraint platform_invoices_amount_cents_check
  check (amount_cents >= 0);

comment on column public.platform_invoices.amount_cents is
  'Veroton välityspalkkio sentteinä; 0 = beta-etu tai muu hyvitys';
