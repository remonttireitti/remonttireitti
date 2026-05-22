-- Urakoitsijan tarjouksen oletusehdot lämpöpumpputyypeittäin

alter table public.contractor_profiles
  add column if not exists default_bid_terms_by_job_type jsonb not null default '{}'::jsonb;

comment on column public.contractor_profiles.default_bid_terms_by_job_type is
  'Oletusehdot työlajeittain: { "ilmalampopumppu": { scope_terms, contract_terms, ... }, ... }';
