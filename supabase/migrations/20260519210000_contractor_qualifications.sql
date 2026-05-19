-- Urakoitsijan lämpöpumppupätevyydet

create type public.refrigerant_license_type as enum (
  'over_3kg',
  'under_3kg',
  'none'
);

create type public.work_capability as enum (
  'qualified',
  'not_qualified'
);

alter table public.contractor_profiles
  add column if not exists refrigerant_license public.refrigerant_license_type,
  add column if not exists electrical_capability public.work_capability,
  add column if not exists lvi_capability public.work_capability;

comment on column public.contractor_profiles.refrigerant_license is
  'Kylmäainelupa: yli 3 kg, alle 3 kg tai ei lupaa';
comment on column public.contractor_profiles.electrical_capability is
  'Sähkötyöt: pätevä vai ei riitä';
comment on column public.contractor_profiles.lvi_capability is
  'LVI-työt: pätevä vai ei riitä';

-- Mitä lämpöpumpputyyppejä urakoitsija asentaa
create table if not exists public.contractor_job_types (
  contractor_id uuid not null references public.contractor_profiles (id) on delete cascade,
  job_type_id uuid not null references public.job_types (id) on delete cascade,
  primary key (contractor_id, job_type_id)
);

alter table public.contractor_job_types enable row level security;

create policy "contractor_job_types: manage own"
  on public.contractor_job_types for all
  using (auth.uid() = contractor_id);

create policy "contractor_job_types: public read"
  on public.contractor_job_types for select
  using (true);
