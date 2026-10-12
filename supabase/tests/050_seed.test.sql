begin;
create extension if not exists pgtap with schema extensions;
select plan(6);
select is((select count(*)::int from public.suppliers where code like 'DEMO-S%'), 4, '4 demo suppliers');
select is((select count(*)::int from public.parts where part_no like 'DEMO-P%'), 5, '5 demo parts');
select is((select count(*)::int from public.template_items ti join public.template_versions v on v.id = ti.version_id
           join public.templates t on t.id = v.template_id where t.name = 'General IQC' and v.version = 1), 26, 'template v1 has 26 items');
select is((select count(*)::int from public.template_characteristics tc join public.template_versions v on v.id = tc.version_id
           join public.templates t on t.id = v.template_id where t.name = 'Fan motor (Demo)'), 3, 'fan motor has 3 dimensions');
select is((select count(*)::int from public.sampling_bands where active and plan_source = 'KHIND'), 8, '8 active sampling bands');
select is((select sum(ac)::int from public.sampling_acceptance where plan_source = 'KHIND'), 0, 'c = 0 for every class');
select * from finish();
rollback;
