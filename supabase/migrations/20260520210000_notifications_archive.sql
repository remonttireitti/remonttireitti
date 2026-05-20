-- Ilmoitusten arkistointi (piilottaa listalta, säilyttää historian)

alter table public.notifications
  add column if not exists archived_at timestamptz;

comment on column public.notifications.archived_at is 'Käyttäjä arkistoi — ei näy etusivulla eikä lasketa lukemattomiin';

create index if not exists notifications_user_active_idx
  on public.notifications (user_id, created_at desc)
  where archived_at is null;

drop index if exists public.notifications_user_unread_idx;

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id)
  where read_at is null and archived_at is null;
