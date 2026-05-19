-- Yhteystiedot tarjouspyynnössä (sijaintivaihe wizardissa)
alter table public.projects
  add column if not exists contact_email text,
  add column if not exists contact_phone text;

comment on column public.projects.contact_email is 'Asiakkaan yhteys-sähköposti tälle urakalle';
comment on column public.projects.contact_phone is 'Asiakkaan puhelin tälle urakalle';
