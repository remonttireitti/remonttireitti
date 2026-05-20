-- Muistutus arvostelusta valmistuneesta urakasta.

alter table public.projects
  add column if not exists review_reminder_sent_at timestamptz;

comment on column public.projects.review_reminder_sent_at is
  'Milloin asiakkaalle lähetettiin muistutus jättää arvostelu';
