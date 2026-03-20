create extension if not exists pgcrypto;

create table if not exists public.klary_chat (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text,
  week_start_key date,
  week_end_key date,
  messages jsonb not null default '[]'::jsonb,
  search_text text not null default ''
);

-- keep updated_at fresh
create or replace function public.set_klary_chat_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tr_klary_chat_updated_at on public.klary_chat;
create trigger tr_klary_chat_updated_at
before update on public.klary_chat
for each row execute function public.set_klary_chat_updated_at();

alter table public.klary_chat enable row level security;

-- Public RLS policies (anonymous/shared)
create policy "klary_chat_select_public" on public.klary_chat
for select using (true);

create policy "klary_chat_insert_public" on public.klary_chat
for insert with check (true);

create policy "klary_chat_update_public" on public.klary_chat
for update using (true) with check (true);

create policy "klary_chat_delete_public" on public.klary_chat
for delete using (true);

