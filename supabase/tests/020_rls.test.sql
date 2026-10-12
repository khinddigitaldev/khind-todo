begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

-- People (as postgres, RLS bypassed)
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'insp.a@example.com'),
  ('00000000-0000-4000-8000-0000000000a2', 'insp.b@example.com'),
  ('00000000-0000-4000-8000-0000000000b1', 'qa@example.com'),
  ('00000000-0000-4000-8000-0000000000c1', 'buyer@example.com'),
  ('00000000-0000-4000-8000-0000000000d1', 'boss@example.com'),
  ('00000000-0000-4000-8000-0000000000e1', 'admin@example.com'),
  ('00000000-0000-4000-8000-0000000000f1', 'gone@example.com');
update public.profiles set role = 'qa' where id = '00000000-0000-4000-8000-0000000000b1';
update public.profiles set role = 'purchasing' where id = '00000000-0000-4000-8000-0000000000c1';
update public.profiles set role = 'management' where id = '00000000-0000-4000-8000-0000000000d1';
update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-0000000000e1';
update public.profiles set active = false where id = '00000000-0000-4000-8000-0000000000f1';

-- Master data + one draft owned by inspector A
insert into public.suppliers (code, name) values ('TSUP', 'Test Supplier (Demo)');
insert into public.templates (name) values ('RLS test template');
insert into public.template_versions (template_id, version)
  select id, 1 from public.templates where name = 'RLS test template';
insert into public.parts (part_no, name, template_id)
  select 'TPART', 'Test part', id from public.templates where name = 'RLS test template';
insert into public.inspections (number, supplier_id, part_id, template_version_id, qty_received, sample_size, inspector_id)
select 'IQC-TEST-0001', s.id, p.id, v.id, 100, 10, '00000000-0000-4000-8000-0000000000a1'
from public.suppliers s, public.parts p, public.template_versions v
where s.code = 'TSUP' and p.part_no = 'TPART' and v.template_id = p.template_id;

-- Inspector A: may edit own draft header, may not touch status
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select results_eq($$ with u as (update public.inspections set lot_no = 'L1' where number = 'IQC-TEST-0001' returning 1) select count(*)::int from u $$,
  $$ values (1) $$, 'owner can edit own draft');
select throws_ok($$ update public.inspections set status = 'approved' where number = 'IQC-TEST-0001' $$,
  '42501', null, 'status cannot be changed directly');
select results_eq($$ with u as (update public.suppliers set name = 'X' returning 1) select count(*)::int from u $$,
  $$ values (0) $$, 'inspector cannot edit suppliers');
select throws_ok($$ insert into public.audit_log (table_name, row_id, action, changes) values ('x','1','insert','{}') $$,
  '42501', null, 'nobody writes the audit log directly');

-- Inspector B: cannot edit A's draft, can read it
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
select results_eq($$ with u as (update public.inspections set lot_no = 'HACK' where number = 'IQC-TEST-0001' returning 1) select count(*)::int from u $$,
  $$ values (0) $$, 'other inspector cannot edit');
select isnt_empty($$ select 1 from public.inspections where number = 'IQC-TEST-0001' $$, 'other inspector can read');

-- QA: can edit suppliers
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);
select results_eq($$ with u as (update public.suppliers set name = 'Test Supplier 2 (Demo)' where code = 'TSUP' returning 1) select count(*)::int from u $$,
  $$ values (1) $$, 'QA can edit suppliers');

-- Purchasing: read-only on inspections
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}', true);
select results_eq($$ with u as (update public.inspections set lot_no = 'P' where number = 'IQC-TEST-0001' returning 1) select count(*)::int from u $$,
  $$ values (0) $$, 'purchasing cannot edit inspections');

-- Management: read-only
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000d1","role":"authenticated"}', true);
select isnt_empty($$ select 1 from public.inspections $$, 'management can read inspections');

-- Deactivated user: sees nothing
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000f1","role":"authenticated"}', true);
select is_empty($$ select 1 from public.inspections $$, 'deactivated user sees nothing');

-- Admin: can change another user's role, not their own active flag
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
select results_eq($$ with u as (update public.profiles set role = 'qa' where email = 'insp.b@example.com' returning 1) select count(*)::int from u $$,
  $$ values (1) $$, 'admin can change roles');
select results_eq($$ with u as (update public.profiles set active = false where email = 'admin@example.com' returning 1) select count(*)::int from u $$,
  $$ values (0) $$, 'admin cannot deactivate themselves');

-- Anonymous: nothing
reset role;
set local role anon;
select is_empty($$ select 1 from public.suppliers $$, 'anon sees nothing');

select * from finish();
rollback;
