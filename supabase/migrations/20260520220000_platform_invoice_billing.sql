-- Manuaalinen välityslaskutus: admin-jono ja urakoitsijan laskutustiedot

alter table public.platform_invoices
  add column if not exists invoice_reference text,
  add column if not exists invoiced_at timestamptz,
  add column if not exists admin_notes text;

alter table public.contractor_profiles
  add column if not exists billing_email text,
  add column if not exists billing_address_line text,
  add column if not exists billing_postal_code text,
  add column if not exists billing_city text;

comment on column public.platform_invoices.invoice_reference is 'Kevytyrittäjä-/laskutuspalvelun viite';
comment on column public.contractor_profiles.billing_email is 'Sähköposti laskulle (jos eri kuin kirjautuminen)';
comment on column public.contractor_profiles.billing_address_line is 'Laskutusosoite';
