begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000002a1', 'au.insp@example.com'),
  ('00000000-0000-4000-8000-0000000002b1', 'au.qa@example.com');
update public.profiles set role = 'qa' where id = '00000000-0000-4000-8000-0000000002b1';
update public.sampling_bands set active = false;
insert into public.sampling_bands (lot_min, lot_max, sample_normal, sample_tightened) values (1, null, 5, 8);
insert into public.suppliers (code, name) values ('ASUP', 'Audit Supplier (Demo)');
insert into public.templates (name) values ('Audit template');
insert into public.template_versions (template_id, version) select id, 1 from public.templates where name = 'Audit template';
insert into public.template_items (version_id, section, position, text)
  select v.id, 'Visual', 1, 'Clean' from public.template_versions v join public.templates t on t.id = v.template_id where t.name = 'Audit template';
insert into public.parts (part_no, name, template_id) select 'APART', 'Audit part', id from public.templates where name = 'Audit template';
create temp table ids (k text primary key, v bigint);
grant all on ids to authenticated;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000002a1","role":"authenticated"}', true);
set local role authenticated;
insert into ids select 'i', public.create_inspection((select id from public.suppliers where code = 'ASUP'),
  (select id from public.parts where part_no = 'APART'), 50);
update public.inspections set lot_no = 'DRAFT-EDIT' where id = (select v from ids);
insert into public.inspection_checks (inspection_id, item_id, result)
  select (select v from ids), id, 'ok' from public.template_items where text = 'Clean';
update public.inspection_defects set found = 0 where inspection_id = (select v from ids);

select is((select count(*)::int from public.audit_log where inspection_id = (select v from ids) and action = 'update'), 0,
  'draft edits are not logged');
select is((select count(*)::int from public.audit_log where inspection_id = (select v from ids) and action = 'insert' and table_name = 'inspections'), 1,
  'creation is logged');

select public.submit_inspection((select v from ids));
select is((select changes -> 'status' from public.audit_log where inspection_id = (select v from ids) and table_name = 'inspections' and action = 'update' order by id desc limit 1),
  '["draft", "submitted"]'::jsonb, 'status change is logged as [old, new]');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000002b1","role":"authenticated"}', true);
select public.return_inspection((select v from ids), 'Lot number wrong');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000002a1","role":"authenticated"}', true);
update public.inspections set lot_no = 'L-123' where id = (select v from ids);
select is((select changes -> 'lot_no' from public.audit_log where inspection_id = (select v from ids) and table_name = 'inspections' order by id desc limit 1),
  '["DRAFT-EDIT", "L-123"]'::jsonb, 'edit after return is logged');
select is((select user_id from public.audit_log where inspection_id = (select v from ids) order by id desc limit 1),
  '00000000-0000-4000-8000-0000000002a1'::uuid, 'who is recorded');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000002b1","role":"authenticated"}', true);
update public.sampling_bands set sample_normal = 6 where active and lot_min = 1;
select isnt_empty($$ select 1 from public.audit_log where table_name = 'sampling_bands' and changes ? 'sample_normal' $$,
  'sampling table changes are logged');

select * from finish();
rollback;
