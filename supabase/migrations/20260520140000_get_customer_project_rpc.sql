-- Asiakkaan oma projekti ilman RLS-silmukkaa (sivu /remontti/[id])

create or replace function public.get_customer_project(p_id uuid)
returns setof public.projects
language sql
stable
security definer
set search_path = public
as $$
  select p.*
  from public.projects p
  where p.id = p_id
    and p.customer_id = auth.uid();
$$;

grant execute on function public.get_customer_project(uuid) to authenticated;
