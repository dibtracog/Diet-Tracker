-- Diet Tracker database schema.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- Everything (foods, log entries, water, goals) lives in one table of JSON
-- records. Row Level Security makes sure a signed-in user can only ever see
-- and change their own rows.

create table if not exists public.records (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id         text        not null,
  kind       text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Kept separate so running this file again updates the list of kinds.
alter table public.records drop constraint if exists records_kind_check;
alter table public.records add constraint records_kind_check
  check (kind in ('food', 'entry', 'pending', 'water', 'weight', 'combo', 'habit', 'habitlog', 'measure', 'profile'));

alter table public.records enable row level security;

grant select, insert, update, delete on public.records to authenticated;

drop policy if exists "Read own records" on public.records;
create policy "Read own records" on public.records
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Add own records" on public.records;
create policy "Add own records" on public.records
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Change own records" on public.records;
create policy "Change own records" on public.records
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Delete own records" on public.records;
create policy "Delete own records" on public.records
  for delete to authenticated
  using ((select auth.uid()) = user_id);
