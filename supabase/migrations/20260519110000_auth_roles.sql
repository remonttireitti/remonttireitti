-- Rooli ja urakoitsijaprofiili rekisteröinnissä

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
  v_full_name text;
  v_company_name text;
begin
  v_full_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name'
  );

  begin
    v_role := (new.raw_user_meta_data ->> 'role')::public.user_role;
  exception
    when others then
      v_role := 'customer';
  end;

  if v_role is null or v_role not in ('customer', 'contractor') then
    v_role := 'customer';
  end if;

  insert into public.profiles (id, full_name, avatar_url, role)
  values (
    new.id,
    v_full_name,
    new.raw_user_meta_data ->> 'avatar_url',
    v_role
  );

  if v_role = 'contractor' then
    v_company_name := nullif(trim(new.raw_user_meta_data ->> 'company_name'), '');
    insert into public.contractor_profiles (id, company_name)
    values (
      new.id,
      coalesce(v_company_name, 'Yritys (täydennä profiilissa)')
    );
  end if;

  return new;
end;
$$;
