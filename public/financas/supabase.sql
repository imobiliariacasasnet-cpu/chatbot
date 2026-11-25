-- Meu Financeiro Pessoal: backup criptografado por conta Supabase.
-- Execute este arquivo no SQL Editor do seu próprio projeto Supabase.
-- O payload contém somente o registro local já criptografado pelo navegador.
create table if not exists public.finance_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.finance_data enable row level security;

revoke all on public.finance_data from anon;
grant select, insert, update on public.finance_data to authenticated;

drop policy if exists "Users can read own finance data" on public.finance_data;
create policy "Users can read own finance data"
on public.finance_data
for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own finance data" on public.finance_data;
create policy "Users can insert own finance data"
on public.finance_data
for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own finance data" on public.finance_data;
create policy "Users can update own finance data"
on public.finance_data
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
