-- Korjaa: infinite recursion detected in policy for relation "profiles"
-- Syy: profiles-politiikka lukee projects-taulua, projects-politiikka lukee profiles-taulua.

-- projects: contractors read published korjataan migraatiossa 20260519170000

-- Varmista että käyttäjä voi luoda oman profiilinsa (jos trigger ei ajanut)
drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own"
  on public.profiles
  for insert
  with check (auth.uid() = id);
