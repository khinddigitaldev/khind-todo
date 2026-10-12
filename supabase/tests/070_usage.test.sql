begin;
create extension if not exists pgtap with schema extensions;
select plan(2);
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000004a1', 'us.insp@example.com'),
  ('00000000-0000-4000-8000-0000000004b1', 'us.qa@example.com');
update public.profiles set role = 'qa' where id = '00000000-0000-4000-8000-0000000004b1';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000004b1","role":"authenticated"}', true);
select ok((select db_bytes > 0 from public.usage_stats()), 'QA sees database size');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000004a1","role":"authenticated"}', true);
select is_empty($$ select * from public.usage_stats() $$, 'inspector sees nothing');
select * from finish();
rollback;
