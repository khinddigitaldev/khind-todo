begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000001a1', 'wf.insp@example.com'),
  ('00000000-0000-4000-8000-0000000001b1', 'wf.qa@example.com'),
  ('00000000-0000-4000-8000-0000000001c1', 'wf.buyer@example.com');
update public.profiles set role = 'qa' where id = '00000000-0000-4000-8000-0000000001b1';
update public.profiles set role = 'purchasing' where id = '00000000-0000-4000-8000-0000000001c1';

update public.sampling_bands set active = false;
insert into public.sampling_bands (lot_min, lot_max, sample_normal, sample_tightened)
  values (1, 15, null, null), (16, null, 10, 15);
insert into public.sampling_acceptance (defect_class, ac) values ('critical', 0), ('major', 0), ('minor', 0)
  on conflict (plan_source, defect_class) do update set ac = 0;

insert into public.suppliers (code, name) values ('WSUP', 'Workflow Supplier (Demo)');
insert into public.templates (name) values ('WF template');
insert into public.template_versions (template_id, version) select id, 1 from public.templates where name = 'WF template';
insert into public.template_items (version_id, section, position, text)
  select v.id, 'Visual', 1, 'No scratches' from public.template_versions v join public.templates t on t.id = v.template_id where t.name = 'WF template';
insert into public.template_characteristics (version_id, position, name, min_value, max_value)
  select v.id, 1, 'Length', 9.9, 10.1 from public.template_versions v join public.templates t on t.id = v.template_id where t.name = 'WF template';
insert into public.parts (part_no, name, template_id) select 'WPART', 'WF part', id from public.templates where name = 'WF template';

create temp table ids (k text primary key, v bigint);
grant all on ids to authenticated;

-- Inspector creates two inspections
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000001a1","role":"authenticated"}', true);
set local role authenticated;
insert into ids select 'good', public.create_inspection(
  (select id from public.suppliers where code = 'WSUP'), (select id from public.parts where part_no = 'WPART'), 100, now(), 'PO1', 'DO1', 'LOT1');
insert into ids select 'bad', public.create_inspection(
  (select id from public.suppliers where code = 'WSUP'), (select id from public.parts where part_no = 'WPART'), 100);

select results_eq($$ select status::text, sample_size from public.inspections where id = (select v from ids where k = 'good') $$,
  $$ values ('draft'::text, 10) $$, 'new inspection is a draft with computed sample size');
select is((select count(*)::int from public.inspection_defects where inspection_id = (select v from ids where k = 'good')), 3,
  'three defect rows created');
select throws_like($$ select public.submit_inspection((select v from ids where k = 'good')) $$,
  'Cannot submit:%checklist item%', 'empty inspection cannot be submitted');

-- Fill in "good": all OK, readings in tolerance, no defects
insert into public.inspection_checks (inspection_id, item_id, result)
  select (select v from ids where k = 'good'), ti.id, 'ok' from public.template_items ti
  join public.template_versions tv on tv.id = ti.version_id join public.templates t on t.id = tv.template_id where t.name = 'WF template';
insert into public.inspection_measurements (inspection_id, characteristic_id, readings, result)
  select (select v from ids where k = 'good'), tc.id, '{10.0,10.05}', 'ok' from public.template_characteristics tc
  join public.template_versions tv on tv.id = tc.version_id join public.templates t on t.id = tv.template_id where t.name = 'WF template';
update public.inspection_defects set found = 0 where inspection_id = (select v from ids where k = 'good');
select is(public.submit_inspection((select v from ids where k = 'good')), 'accept', 'submit returns accept');
select results_eq($$ with u as (update public.inspection_defects set found = 5
    where inspection_id = (select v from ids where k = 'good') returning 1) select count(*)::int from u $$,
  $$ values (0) $$, 'cannot edit after submit (RLS: 0 rows)');

-- Fill in "bad": NG item with comment, one major defect
insert into public.inspection_checks (inspection_id, item_id, result, comment)
  select (select v from ids where k = 'bad'), ti.id, 'ng', 'Deep scratch' from public.template_items ti
  join public.template_versions tv on tv.id = ti.version_id join public.templates t on t.id = tv.template_id where t.name = 'WF template';
insert into public.inspection_measurements (inspection_id, characteristic_id, readings, result)
  select (select v from ids where k = 'bad'), tc.id, '{10.0}', 'ok' from public.template_characteristics tc
  join public.template_versions tv on tv.id = tc.version_id join public.templates t on t.id = tv.template_id where t.name = 'WF template';
update public.inspection_defects set found = 0 where inspection_id = (select v from ids where k = 'bad');
update public.inspection_defects set found = 1, description = 'Scratch on cover' where inspection_id = (select v from ids where k = 'bad') and defect_class = 'major';
select is(public.submit_inspection((select v from ids where k = 'bad')), 'reject', 'one major defect rejects (c = 0)');
select throws_ok($$ select public.approve_inspection((select v from ids where k = 'good'), 'accept', 'accept', 100, 0) $$,
  '42501', null, 'inspector cannot approve');

-- QA decides
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000001b1","role":"authenticated"}', true);
select is(public.approve_inspection((select v from ids where k = 'good'), 'accept', 'accept', 100, 0), null, 'accept creates no MDR');
select throws_ok($$ select public.approve_inspection((select v from ids where k = 'bad'), 'accept', 'accept', 100, 0) $$,
  'P0001', 'The system verdict is Reject. Use UAI or another action.', 'accept blocked on reject verdict');
select throws_ok($$ select public.approve_inspection((select v from ids where k = 'bad'), 'accept', 'uai', 100, 0) $$,
  'P0001', 'UAI needs a reason.', 'UAI needs a reason');
select matches(public.approve_inspection((select v from ids where k = 'bad'), 'reject', 'rts', 0, 100), '^MDR-[0-9]{4}-[0-9]{4}$', 'reject creates MDR');
select results_eq($$ select summary from public.mdrs where inspection_id = (select v from ids where k = 'bad') $$,
  $$ values ('major: 1 found - Scratch on cover'::text) $$, 'MDR summary lists the defects');
select throws_ok($$ select public.reopen_inspection((select v from ids where k = 'good'), '') $$,
  'P0001', 'Please give a reason for reopening.', 'reopen needs a reason');
select lives_ok($$ select public.reopen_inspection((select v from ids where k = 'good'), 'Wrong lot number') $$, 'QA reopens');
select is((select status::text from public.inspections where id = (select v from ids where k = 'good')), 'submitted', 'reopened goes back to submitted');

-- QA cannot approve an inspection they performed themselves
insert into ids select 'own', public.create_inspection(
  (select id from public.suppliers where code = 'WSUP'), (select id from public.parts where part_no = 'WPART'), 5);
insert into public.inspection_checks (inspection_id, item_id, result)
  select (select v from ids where k = 'own'), ti.id, 'ok' from public.template_items ti
  join public.template_versions tv on tv.id = ti.version_id join public.templates t on t.id = tv.template_id where t.name = 'WF template';
insert into public.inspection_measurements (inspection_id, characteristic_id, readings, result)
  select (select v from ids where k = 'own'), tc.id, '{10.0}', 'ok' from public.template_characteristics tc
  join public.template_versions tv on tv.id = tc.version_id join public.templates t on t.id = tv.template_id where t.name = 'WF template';
update public.inspection_defects set found = 0 where inspection_id = (select v from ids where k = 'own');
select is(public.submit_inspection((select v from ids where k = 'own')), 'accept', 'QA can inspect too');
select throws_ok($$ select public.approve_inspection((select v from ids where k = 'own'), 'accept', 'accept', 5, 0) $$,
  '42501', 'You cannot approve an inspection you performed.', 'QA cannot approve own inspection');

select * from finish();
rollback;
