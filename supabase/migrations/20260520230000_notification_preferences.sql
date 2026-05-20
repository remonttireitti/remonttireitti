-- Ilmoitusasetukset profiilissa (in-app + sähköposti)

alter table public.profiles
  add column if not exists notify_in_app boolean not null default true,
  add column if not exists notify_email boolean not null default true,
  add column if not exists notify_admin_new_users boolean not null default true,
  add column if not exists notify_new_projects boolean not null default true;

comment on column public.profiles.notify_in_app is 'Sovelluksen ilmoitukset';
comment on column public.profiles.notify_email is 'Sähköposti-ilmoitukset';
comment on column public.profiles.notify_admin_new_users is 'Admin: uudet käyttäjät ja urakoitsijat';
comment on column public.profiles.notify_new_projects is 'Urakoitsija: uudet tarjouspyynnöt (vain valitut lämpöpumput)';
