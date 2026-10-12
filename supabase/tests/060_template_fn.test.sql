begin;
create extension if not exists pgtap with schema extensions;
select plan(5);
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000003a1', 'tf.insp@example.com'),
  ('00000000-0000-4000-8000-0000000003b1', 'tf.qa@example.com');
update public.profiles set role = 'qa' where id = '00000000-0000-4000-8000-0000000003b1';
create temp table ids (k text primary key, v bigint);
grant all on ids to authenticated;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000003b1","role":"authenticated"}', true);
set local role authenticated;
insert into ids select 'v1', public.create_template_version(null, 'TF template',
  '[{"section":"Visual","text":"Clean"},{"section":"Visual","text":"No cracks"}]',
  '[{"name":"Length","nominal":10,"min":9.9,"max":10.1,"unit":"mm","defectClass":"major"}]');
select is((select count(*)::int from public.template_items where version_id = (select v from ids where k = 'v1')), 2, 'items saved in order');
insert into ids select 'v2', public.create_template_version(
  (select template_id from public.template_versions where id = (select v from ids where k = 'v1')), null,
  '[{"section":"Visual","text":"Clean"}]', '[]');
select is((select version from public.template_versions where id = (select v from ids where k = 'v2')), 2, 'second save is version 2');
select throws_ok($$ select public.create_template_version(null, 'Empty', '[]', '[]') $$, 'P0001',
  'A template needs at least one checklist item.', 'empty template refused');

select lives_ok($$ select public.replace_sampling_bands('[{"lotMin":1,"lotMax":null,"sampleNormal":7,"sampleTightened":9}]') $$,
  'QA replaces the sampling table');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000003a1","role":"authenticated"}', true);
select throws_ok($$ select public.create_template_version(null, 'Hack', '[{"section":"A","text":"B"}]', '[]') $$,
  '42501', 'Only QA can edit templates.', 'inspector cannot edit templates');

select * from finish();
rollback;
