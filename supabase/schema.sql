create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  telefone text,
  cpf text,
  email text,
  empresa text,
  origem text,
  produto text,
  status text not null default 'Novo',
  etapa text not null default 'Entrada',
  valor_interesse numeric(12,2),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_user_id_idx on public.leads(user_id);
create index if not exists leads_updated_at_idx on public.leads(updated_at desc);
create index if not exists leads_nome_idx on public.leads(nome);
create index if not exists leads_telefone_idx on public.leads(telefone);
create index if not exists leads_cpf_idx on public.leads(cpf);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger leads_set_updated_at
before update on public.leads
for each row
execute function public.handle_updated_at();

alter table public.leads enable row level security;

create policy "Users can view own leads"
on public.leads
for select
using (auth.uid() = user_id);

create policy "Users can insert own leads"
on public.leads
for insert
with check (auth.uid() = user_id);

create policy "Users can update own leads"
on public.leads
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own leads"
on public.leads
for delete
using (auth.uid() = user_id);
