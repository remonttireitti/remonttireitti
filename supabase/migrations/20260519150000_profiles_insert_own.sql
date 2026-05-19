-- Käyttäjä voi luoda oman profiilinsä jos trigger ei ajanut (esim. vanha tili)
create policy "profiles: insert own"
  on public.profiles
  for insert
  with check (auth.uid() = id);
