begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000005a1', 'pa.insp@example.com'),
  ('00000000-0000-4000-8000-0000000005b1', 'pa.qa@example.com');
update public.profiles set role = 'qa' where id = '00000000-0000-4000-8000-0000000005b1';

update public.sampling_bands set active = false;
insert into public.sampling_bands (lot_min, lot_max, sample_normal, sample_tightened) values (1, null, 10, 15);
insert into public.sampling_acceptance (defect_class, ac) values ('critical', 0), ('major', 0), ('minor', 0)
  on conflict (plan_source, defect_class) do update set ac = 0;

insert into public.suppliers (code, name, category) values ('PASUP', 'Part A Supplier (Demo)', 'local');
insert into public.templates (name) values ('PA template');
insert into public.template_versions (template_id, version) select id, 1 from public.templates where name = 'PA template';
insert into public.template_items (version_id, section, position, text)
  select v.id, 'Visual', 1, 'Clean' from public.template_versions v join public.templates t on t.id = v.template_id where t.name = 'PA template';
insert into public.parts (part_no, name, template_id) select 'PA-N', 'Normal part', id from public.templates where name = 'PA template';
insert into public.parts (part_no, name, inspection_type) values ('PA-Q', 'Quick part', 'quick');

create temp table ids (k text primary key, v bigint);
grant all on ids to authenticated;

-- Inspector ---------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000005a1","role":"authenticated"}', true);
set local role authenticated;

insert into ids select 'bad', public.create_inspection((select id from public.suppliers where code = 'PASUP'),
  (select id from public.parts where part_no = 'PA-N'), 100, now(), 'PO1', 'DO1', 'L1', 'GRN-1', 'REF-1', 'MOTOR-1');
select results_eq($$ select grn_no, ref_no, motor_part_no, quick from public.inspections where id = (select v from ids where k = 'bad') $$,
  $$ values ('GRN-1'::text, 'REF-1'::text, 'MOTOR-1'::text, false) $$, 'new Part A fields are stored');
select results_eq($$ with u as (update public.inspections set component_marking = 'UL 94V-0' where id = (select v from ids where k = 'bad') returning 1) select count(*)::int from u $$,
  $$ values (1) $$, 'owner edits component marking');
select throws_ok($$ update public.inspections set lot_decision = 'accept' where id = (select v from ids where k = 'bad') $$,
  '42501', null, 'decision cannot be set directly');

insert into public.inspection_checks (inspection_id, item_id, result)
  select (select v from ids where k = 'bad'), id, 'ok' from public.template_items where text = 'Clean' and version_id = (select template_version_id from public.inspections where id = (select v from ids where k = 'bad'));
update public.inspection_defects set found = 0 where inspection_id = (select v from ids where k = 'bad');
update public.inspection_defects set found = 1, description = 'Crack' where inspection_id = (select v from ids where k = 'bad') and defect_class = 'major';
select is(public.submit_inspection((select v from ids where k = 'bad')), 'reject', 'major defect -> reject verdict');

insert into ids select 'good', public.create_inspection((select id from public.suppliers where code = 'PASUP'),
  (select id from public.parts where part_no = 'PA-N'), 100);
insert into public.inspection_checks (inspection_id, item_id, result)
  select (select v from ids where k = 'good'), id, 'ok' from public.template_items where text = 'Clean' and version_id = (select template_version_id from public.inspections where id = (select v from ids where k = 'good'));
update public.inspection_defects set found = 0 where inspection_id = (select v from ids where k = 'good');
select is(public.submit_inspection((select v from ids where k = 'good')), 'accept', 'clean lot -> accept verdict');

insert into ids select 'quick', public.create_inspection((select id from public.suppliers where code = 'PASUP'),
  (select id from public.parts where part_no = 'PA-Q'), 40);
select results_eq($$ select quick, sample_size, (select count(*)::int from public.inspection_defects where inspection_id = i.id)
                    from public.inspections i where id = (select v from ids where k = 'quick') $$,
  $$ values (true, null::int, 0) $$, 'quick lot: no sample size, no defect rows');
select throws_like($$ select public.submit_inspection((select v from ids where k = 'quick')) $$,
  'Cannot submit:%quick check result not entered%', 'quick lot needs a result');
update public.inspections set quick_result = 'ng', quick_qty = 40 where id = (select v from ids where k = 'quick');
select throws_like($$ select public.submit_inspection((select v from ids where k = 'quick')) $$,
  'Cannot submit:%NG quick check needs a remark%', 'NG quick check needs a remark');
update public.inspections set quick_remark = 'Scratched surface' where id = (select v from ids where k = 'quick');
select is(public.submit_inspection((select v from ids where k = 'quick')), 'reject', 'NG quick check -> reject verdict');

-- QC Supervisor -----------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000005b1","role":"authenticated"}', true);
select throws_ok($$ select public.approve_inspection((select v from ids where k = 'bad'), 'accept', 'accept', 100, 0) $$,
  'P0001', 'The system verdict is Reject. Use UAI or another action.', 'ACCEPT+ACCEPT blocked on reject verdict');
select throws_ok($$ select public.approve_inspection((select v from ids where k = 'bad'), 'accept', 'uai', 100, 0) $$,
  'P0001', 'UAI needs a reason.', 'UAI needs a reason');
select throws_ok($$ select public.approve_inspection((select v from ids where k = 'bad'), 'reject', 'rts', 50, 40) $$,
  'P0001', 'Accept qty + Reject qty must equal the quantity received (100).', 'quantities must add up');
select throws_ok($$ select public.approve_inspection((select v from ids where k = 'bad'), 'reject', 'accept', 0, 100) $$,
  'P0001', 'Action ACCEPT is not allowed with decision REJECT.', 'action must fit the decision');
select matches(public.approve_inspection((select v from ids where k = 'bad'), 'reject', 'rts', 0, 100), '^MDR-[0-9]{4}-[0-9]{4}$', 'REJECT creates an MDR');
select results_eq($$ select lot_decision::text, lot_action::text, qty_affected from public.mdrs where inspection_id = (select v from ids where k = 'bad') $$,
  $$ values ('reject'::text, 'rts'::text, 100) $$, 'MDR carries decision, action and reject qty');
select throws_ok($$ select public.approve_inspection((select v from ids where k = 'good'), 'others', 'accept', 100, 0) $$,
  'P0001', 'Please describe the OTHERS decision.', 'OTHERS needs text');
select matches(public.approve_inspection((select v from ids where k = 'good'), 'accept', 'accept', 100, 0, null, null, true),
  '^MDR-', 'Raise MDR on an accepted lot creates an MDR');
select is((select count(*)::int from public.inspections where status = 'approved' and lot_decision is null), 0,
  'every approved lot has a lot decision (old dispositions converted)');

select * from finish();
rollback;
