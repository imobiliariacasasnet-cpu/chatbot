-- Meu Financeiro Pessoal — isolamento por conta
-- Execute uma única vez no SQL Editor do projeto Supabase.
-- Um documento JSON é guardado por usuário autenticado, identificado pelo ID
-- de auth.users. Não existe acesso anônimo à tabela.

create table if not exists public.finance_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{"transactions":[],"budgets":[],"goals":[],"cards":[],"debts":[]}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint finance_data_payload_is_object check (jsonb_typeof(payload) = 'object')
);

alter table public.finance_data enable row level security;
alter table public.finance_data force row level security;

revoke all on table public.finance_data from public, anon;
grant select, insert, update on table public.finance_data to authenticated;

drop policy if exists "Users can read own finance data" on public.finance_data;
create policy "Users can read own finance data"
on public.finance_data for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own finance data" on public.finance_data;
create policy "Users can insert own finance data"
on public.finance_data for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own finance data" on public.finance_data;
create policy "Users can update own finance data"
on public.finance_data for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Não há política para anon, DELETE ou acesso a linhas de outras contas.
