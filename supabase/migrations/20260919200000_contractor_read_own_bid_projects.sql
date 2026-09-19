-- Urakoitsija näkee projektin, johon on lähettänyt tarjouksen (työpöytä, omat tarjoukset).

create or replace function public.contractor_can_read_project(project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_contractor_user()
    and exists (
      select 1
      from public.projects p
      where p.id = project_id
        and (
          p.status in ('published', 'receiving_bids')
          or (
            p.status in ('bid_accepted', 'in_progress', 'completed')
            and p.accepted_bid_id is not null
            and exists (
              select 1
              from public.bids b
              where b.id = p.accepted_bid_id
                and b.contractor_id = auth.uid()
            )
          )
          or exists (
            select 1
            from public.bids b
            where b.project_id = p.id
              and b.contractor_id = auth.uid()
              and b.submitted_at is not null
              and b.status in ('submitted', 'accepted', 'rejected', 'withdrawn')
          )
        )
    );
$$;
