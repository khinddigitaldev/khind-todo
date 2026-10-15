-- text[] || 'literal' is parsed as an array literal; use array_append for every message.
create or replace function public.submit_inspection(p_id bigint) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v public.inspections;
  missing text[] := '{}';
  n int;
begin
  select * into v from public.inspections where id = p_id for update;
  if not found then raise exception 'Inspection not found.'; end if;
  if v.inspector_id <> auth.uid() or not public.has_role('inspector', 'qa') then
    raise exception 'Only the inspector who owns this inspection can submit it.' using errcode = '42501';
  end if;
  if v.status not in ('draft', 'returned') then
    raise exception 'This inspection is already %.', v.status;
  end if;

  if v.quick then
    if v.quick_result is null then missing := array_append(missing, 'quick check result not entered'); end if;
    if v.quick_qty is null then
      missing := array_append(missing, 'quick check qty not entered');
    elsif v.quick_qty > v.qty_received then
      missing := array_append(missing, 'quick check qty must be between 1 and the lot quantity');
    end if;
    if v.quick_result = 'ng' and coalesce(trim(v.quick_remark), '') = '' then
      missing := array_append(missing, 'NG quick check needs a remark');
    end if;
  else
    select count(*) into n from public.template_items ti
    where ti.version_id = v.template_version_id
      and not exists (select 1 from public.inspection_checks c where c.inspection_id = p_id and c.item_id = ti.id);
    if n > 0 then missing := array_append(missing, format('%s checklist item(s) not answered', n)); end if;

    select count(*) into n from public.inspection_checks c
    where c.inspection_id = p_id and c.result = 'ng' and coalesce(trim(c.comment), '') = '';
    if n > 0 then missing := array_append(missing, format('%s NG item(s) need a comment', n)); end if;

    select count(*) into n from public.template_characteristics tc
    where tc.version_id = v.template_version_id
      and not exists (select 1 from public.inspection_measurements m
                      where m.inspection_id = p_id and m.characteristic_id = tc.id and cardinality(m.readings) >= 1);
    if n > 0 then missing := array_append(missing, format('%s dimension(s) have no readings', n)); end if;

    select count(*) into n from public.inspection_measurements m
    where m.inspection_id = p_id and cardinality(m.readings) > v.sample_size;
    if n > 0 then missing := array_append(missing, format('%s dimension(s) have more readings than the sample size', n)); end if;

    select count(*) into n from public.inspection_defects d where d.inspection_id = p_id and d.found is null;
    if n > 0 then missing := array_append(missing, format('%s defect count(s) not entered', n)); end if;

    select count(*) into n from public.inspection_defects d where d.inspection_id = p_id and d.found > v.sample_size;
    if n > 0 then missing := array_append(missing, 'defects found cannot be more than the sample size'); end if;
  end if;

  if cardinality(missing) > 0 then
    raise exception 'Cannot submit: %.', array_to_string(missing, '; ');
  end if;

  if not v.quick then
    update public.inspection_defects d
    set ac = coalesce(a.ac, 0), re = coalesce(a.re, 1)
    from (select dc, sa.ac, sa.re
          from unnest(enum_range(null::public.defect_class)) dc
          left join public.sampling_acceptance sa on sa.plan_source = 'KHIND' and sa.defect_class = dc) a
    where d.inspection_id = p_id and d.defect_class = a.dc;
  end if;

  update public.inspections
  set status = 'submitted', submitted_at = now(), return_comment = null,
      verdict = public.inspection_verdict(p_id)
  where id = p_id;
  return public.inspection_verdict(p_id);
end $$;
