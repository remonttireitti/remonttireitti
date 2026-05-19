-- Korjaa profiilit joilla on urakoitsijarivi mutta väärä rooli
update public.profiles p
set role = 'contractor'
from public.contractor_profiles c
where p.id = c.id
  and p.role is distinct from 'contractor';
