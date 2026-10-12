begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

select has_table('public', 'inspections', 'inspections table exists');

-- isolate from the demo bands seeded later
update public.sampling_bands set active = false;
insert into public.sampling_bands (lot_min, lot_max, sample_normal, sample_tightened) values
  (1, 15, null, null), (16, 50, 10, 15), (51, 150, 15, 25), (10001, null, 80, 125);

select is(public.sample_size_for(10, 'normal'), 10, 'small lot: inspect all');
select is(public.sample_size_for(16, 'normal'), 10, 'band lower edge');
select is(public.sample_size_for(50, 'tightened'), 15, 'band upper edge, tightened');
select is(public.sample_size_for(12, 'tightened'), 12, 'sample >= lot -> whole lot');
select is(public.sample_size_for(50000, 'normal'), 80, 'open-ended last band');
select is(public.sample_size_for(40, 'normal', 'full'), 40, '100% inspection type');
select throws_ok($$ select public.sample_size_for(0, 'normal') $$, 'P0001',
  'Lot size must be at least 1', 'lot 0 rejected');
select throws_ok($$ select public.sample_size_for(200, 'normal') $$, 'P0001',
  'No sampling band covers a lot of 200. Ask QA to update the sampling table.', 'gap reported');

select matches(public.next_number('TST'), '^TST-[0-9]{4}-[0-9]{4}$', 'number format');
select isnt(public.next_number('TST'), public.next_number('TST'), 'numbers are unique');

insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-4000-8000-000000000001', 'new.user@example.com', '{"full_name":"New User"}');
select results_eq(
  $$ select full_name, role::text, active from public.profiles
     where id = '00000000-0000-4000-8000-000000000001' $$,
  $$ values ('New User'::text, 'inspector'::text, true) $$,
  'profile created for a new auth user');

select * from finish();
rollback;
