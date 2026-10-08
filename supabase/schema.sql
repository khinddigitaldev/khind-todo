-- KHIND Todo — database setup.
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once.

create table if not exists public.todos (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 200),
  is_done     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists todos_user_id_idx on public.todos (user_id);

-- Row Level Security: the database itself makes sure each person
-- can only see and change their own todos.
alter table public.todos enable row level security;

drop policy if exists "Users can read their own todos" on public.todos;
create policy "Users can read their own todos"
  on public.todos for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their own todos" on public.todos;
create policy "Users can add their own todos"
  on public.todos for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own todos" on public.todos;
create policy "Users can update their own todos"
  on public.todos for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own todos" on public.todos;
create policy "Users can delete their own todos"
  on public.todos for delete to authenticated
  using ((select auth.uid()) = user_id);
