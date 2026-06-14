-- Tarkemmat sähkö- (S1/S2/S3) ja LVI-pätevyydet lämpöpumpuille

alter table public.contractor_profiles
  add column if not exists electrical_qualification text,
  add column if not exists lvi_qualifications text[] not null default '{}';

comment on column public.contractor_profiles.electrical_qualification is
  'Sähkötöiden johtajan pätevyys: s1, s2, s3, none tai subcontract';
comment on column public.contractor_profiles.lvi_qualifications is
  'LVI-pätevyydet: putki_asentaja, markatila_vedeneristaja, viemarisaneeraaja, subcontract, none';

-- Siirrä vanhat arvot (käyttäjät täydentävät profiilin myöhemmin tarkemmin)
update public.contractor_profiles
set electrical_qualification = case
  when electrical_capability = 'not_qualified' then 'none'
  else null
end
where electrical_qualification is null
  and electrical_capability is not null;

update public.contractor_profiles
set lvi_qualifications = case
  when lvi_capability = 'qualified' then array['putki_asentaja']::text[]
  when lvi_capability = 'not_qualified' then array['none']::text[]
  else lvi_qualifications
end
where lvi_qualifications = '{}'
  and lvi_capability is not null;

alter table public.contractor_profiles
  drop column if exists electrical_capability,
  drop column if exists lvi_capability;

alter table public.contractor_profiles
  drop constraint if exists contractor_profiles_electrical_qualification_check;

alter table public.contractor_profiles
  add constraint contractor_profiles_electrical_qualification_check
  check (
    electrical_qualification is null
    or electrical_qualification in ('s1', 's2', 's3', 'none', 'subcontract')
  );

drop type if exists public.work_capability;
