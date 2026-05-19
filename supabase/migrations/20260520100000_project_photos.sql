-- Tarjouspyynnön kuvat (storage + metadata)

create table public.project_photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  storage_path text not null,
  original_name text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index project_photos_project_idx on public.project_photos (project_id, sort_order);

alter table public.project_photos enable row level security;

-- RLS-käytännöt: 20260520130000_project_photos_rls.sql (recursion-safe, aja RLS-korjauksen jälkeen)

-- Storage bucket (private; signed URLs palvelimella)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-photos',
  'project-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

create policy "project_photos_storage: customer upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'project-photos'
    and (storage.foldername(name))[1] in (
      select p.id::text
      from public.projects p
      where p.customer_id = auth.uid()
    )
  );

create policy "project_photos_storage: read via project access"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'project-photos'
    and (
      exists (
        select 1 from public.projects p
        where p.id::text = (storage.foldername(name))[1]
          and p.customer_id = auth.uid()
      )
      or (
        public.is_contractor_user()
        and exists (
          select 1 from public.projects p
          where p.id::text = (storage.foldername(name))[1]
            and (
              p.status in ('published', 'receiving_bids')
              or (
                p.status in ('bid_accepted', 'in_progress', 'completed')
                and p.accepted_bid_id is not null
                and exists (
                  select 1 from public.bids b
                  where b.id = p.accepted_bid_id
                    and b.contractor_id = auth.uid()
                )
              )
            )
        )
      )
    )
  );
