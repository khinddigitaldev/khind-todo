-- Saving a template always creates a NEW version; old inspections keep theirs.
create function public.create_template_version(
  p_template_id bigint, p_name text, p_items jsonb, p_chars jsonb
) returns bigint language plpgsql security invoker set search_path = '' as $$
declare
  v_template bigint := p_template_id;
  v_version int;
  v_id bigint;
begin
  if not public.has_role('qa') then raise exception 'Only QA can edit templates.' using errcode = '42501'; end if;
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'A template needs at least one checklist item.';
  end if;
  if v_template is null then
    insert into public.templates (name) values (trim(p_name)) returning id into v_template;
  end if;
  select coalesce(max(version), 0) + 1 into v_version from public.template_versions where template_id = v_template;
  insert into public.template_versions (template_id, version) values (v_template, v_version) returning id into v_id;

  insert into public.template_items (version_id, section, position, text)
  select v_id, trim(x.e ->> 'section'), x.n::int, trim(x.e ->> 'text')
  from jsonb_array_elements(p_items) with ordinality as x (e, n);

  insert into public.template_characteristics (version_id, position, name, nominal, min_value, max_value, unit, defect_class)
  select v_id, x.n::int, trim(x.e ->> 'name'), (x.e ->> 'nominal')::numeric, (x.e ->> 'min')::numeric,
         (x.e ->> 'max')::numeric, coalesce(nullif(trim(x.e ->> 'unit'), ''), 'mm'),
         (x.e ->> 'defectClass')::public.defect_class
  from jsonb_array_elements(coalesce(p_chars, '[]'::jsonb)) with ordinality as x (e, n);
  return v_id;
end $$;

-- Replacing the table keeps old bands (inactive) for history and the audit log.
create function public.replace_sampling_bands(p_bands jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not public.has_role('qa') then raise exception 'Only QA can change the sampling table.' using errcode = '42501'; end if;
  update public.sampling_bands set active = false where active and plan_source = 'KHIND';
  insert into public.sampling_bands (lot_min, lot_max, sample_normal, sample_tightened)
  select (e ->> 'lotMin')::int, (e ->> 'lotMax')::int, (e ->> 'sampleNormal')::int, (e ->> 'sampleTightened')::int
  from jsonb_array_elements(p_bands) e;
end $$;

revoke execute on function public.create_template_version, public.replace_sampling_bands from public, anon;
grant execute on function public.create_template_version, public.replace_sampling_bands to authenticated;
