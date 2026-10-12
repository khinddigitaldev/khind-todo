-- Every status change goes through these functions. Messages are user-facing.

create function public.create_inspection(
  p_supplier_id bigint, p_part_id bigint, p_qty int, p_received_at timestamptz default now(),
  p_po text default null, p_do text default null, p_lot text default null
) returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_part public.parts;
  v_version bigint;
  v_id bigint;
begin
  if not public.has_role('inspector', 'qa') then
    raise exception 'Only inspectors and QA can start an inspection.' using errcode = '42501';
  end if;
  select * into v_part from public.parts where id = p_part_id and active;
  if not found then raise exception 'Part not found or inactive.'; end if;
  if v_part.inspection_type = 'none' then
    raise exception 'Part % is set to "no inspection".', v_part.part_no;
  end if;
  if v_part.template_id is null then
    raise exception 'Part % has no inspection template. Ask QA to assign one.', v_part.part_no;
  end if;
  if not exists (select 1 from public.suppliers where id = p_supplier_id and active) then
    raise exception 'Supplier not found or inactive.';
  end if;
  select id into v_version from public.template_versions
  where template_id = v_part.template_id order by version desc limit 1;
  if v_version is null then raise exception 'The template for part % has no versions yet.', v_part.part_no; end if;

  insert into public.inspections (number, supplier_id, part_id, template_version_id, po_no, do_no, lot_no,
                                  qty_received, received_at, sample_size, inspector_id)
  values (public.next_number('IQC'), p_supplier_id, p_part_id, v_version,
          nullif(trim(p_po), ''), nullif(trim(p_do), ''), nullif(trim(p_lot), ''),
          p_qty, coalesce(p_received_at, now()),
          public.sample_size_for(p_qty, 'normal', v_part.inspection_type), auth.uid())
  returning id into v_id;

  insert into public.inspection_defects (inspection_id, defect_class)
  select v_id, c from unnest(enum_range(null::public.defect_class)) c;
  return v_id;
end $$;

create function public.inspection_verdict(p_id bigint) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when bool_or(d.found is null) then null
    when bool_or(d.found >= coalesce(d.re, a.re, 1)) then 'reject'
    else 'accept' end
  from public.inspection_defects d
  left join public.sampling_acceptance a on a.plan_source = 'KHIND' and a.defect_class = d.defect_class
  where d.inspection_id = p_id
$$;

create function public.submit_inspection(p_id bigint) returns text
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

  select count(*) into n from public.template_items ti
  where ti.version_id = v.template_version_id
    and not exists (select 1 from public.inspection_checks c where c.inspection_id = p_id and c.item_id = ti.id);
  if n > 0 then missing := missing || format('%s checklist item(s) not answered', n); end if;

  select count(*) into n from public.inspection_checks
  where inspection_id = p_id and result = 'ng' and coalesce(trim(comment), '') = '';
  if n > 0 then missing := missing || format('%s NG item(s) need a comment', n); end if;

  select count(*) into n from public.template_characteristics tc
  where tc.version_id = v.template_version_id
    and not exists (select 1 from public.inspection_measurements m
                    where m.inspection_id = p_id and m.characteristic_id = tc.id and cardinality(m.readings) >= 1);
  if n > 0 then missing := missing || format('%s dimension(s) have no readings', n); end if;

  select count(*) into n from public.inspection_measurements
  where inspection_id = p_id and cardinality(readings) > v.sample_size;
  if n > 0 then missing := missing || format('%s dimension(s) have more readings than the sample size', n); end if;

  select count(*) into n from public.inspection_defects where inspection_id = p_id and found is null;
  if n > 0 then missing := missing || format('%s defect count(s) not entered', n); end if;

  select count(*) into n from public.inspection_defects where inspection_id = p_id and found > v.sample_size;
  if n > 0 then missing := missing || 'defects found cannot be more than the sample size'; end if;

  if cardinality(missing) > 0 then
    raise exception 'Cannot submit: %.', array_to_string(missing, '; ');
  end if;

  -- Snapshot the acceptance numbers in force today.
  update public.inspection_defects d
  set ac = coalesce(a.ac, 0), re = coalesce(a.re, 1)
  from (select dc, sa.ac, sa.re
        from unnest(enum_range(null::public.defect_class)) dc
        left join public.sampling_acceptance sa on sa.plan_source = 'KHIND' and sa.defect_class = dc) a
  where d.inspection_id = p_id and d.defect_class = a.dc;

  update public.inspections
  set status = 'submitted', submitted_at = now(), return_comment = null,
      verdict = public.inspection_verdict(p_id)
  where id = p_id;
  return public.inspection_verdict(p_id);
end $$;

create function public.return_inspection(p_id bigint, p_comment text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_role('qa') then raise exception 'Only QA can return an inspection.' using errcode = '42501'; end if;
  if coalesce(trim(p_comment), '') = '' then raise exception 'Please say what needs fixing.'; end if;
  update public.inspections set status = 'returned', return_comment = trim(p_comment)
  where id = p_id and status = 'submitted';
  if not found then raise exception 'Only submitted inspections can be returned.'; end if;
end $$;

create function public.approve_inspection(
  p_id bigint, p_disposition public.disposition, p_concession_reason text default null
) returns text language plpgsql security definer set search_path = '' as $$
declare
  v public.inspections;
  v_verdict text;
  v_summary text;
  v_ncr text;
begin
  if not public.has_role('qa') then raise exception 'Only QA can approve.' using errcode = '42501'; end if;
  select * into v from public.inspections where id = p_id for update;
  if not found then raise exception 'Inspection not found.'; end if;
  if v.status <> 'submitted' then raise exception 'Only submitted inspections can be approved.'; end if;
  if v.inspector_id = auth.uid() then
    raise exception 'You cannot approve an inspection you performed.' using errcode = '42501';
  end if;
  v_verdict := public.inspection_verdict(p_id);
  if v_verdict = 'reject' and p_disposition = 'accept' then
    raise exception 'The system verdict is Reject. Choose concession, sort/rework or reject.';
  end if;
  if p_disposition = 'concession' and coalesce(trim(p_concession_reason), '') = '' then
    raise exception 'A concession needs a reason.';
  end if;

  update public.inspections
  set status = 'approved', approver_id = auth.uid(), approved_at = now(), disposition = p_disposition,
      verdict = v_verdict, reopen_reason = null,
      concession_reason = case when p_disposition = 'concession' then trim(p_concession_reason) end
  where id = p_id;

  if p_disposition <> 'accept' then
    select coalesce(string_agg(format('%s: %s found%s', d.defect_class, d.found,
                                      coalesce(' - ' || nullif(trim(d.description), ''), '')),
                               '; ' order by d.defect_class), 'No defects counted')
    into v_summary
    from public.inspection_defects d where d.inspection_id = p_id and d.found > 0;

    insert into public.ncrs (number, inspection_id, qty_affected, summary, disposition)
    values (public.next_number('NCR'), p_id, v.qty_received, v_summary, p_disposition)
    on conflict (inspection_id) do update set disposition = excluded.disposition, summary = excluded.summary
    returning number into v_ncr;
  end if;
  return v_ncr;
end $$;

create function public.reopen_inspection(p_id bigint, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_role('qa') then raise exception 'Only QA can reopen.' using errcode = '42501'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Please give a reason for reopening.'; end if;
  update public.inspections
  set status = 'submitted', reopen_reason = trim(p_reason), approver_id = null, approved_at = null, disposition = null
  where id = p_id and status = 'approved';
  if not found then raise exception 'Only approved inspections can be reopened.'; end if;
end $$;

create function public.override_sample_size(p_id bigint, p_size int, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v public.inspections;
begin
  if not public.has_role('qa') then raise exception 'Only QA can override the sample size.' using errcode = '42501'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Please give a reason for the override.'; end if;
  select * into v from public.inspections where id = p_id for update;
  if not found or v.status = 'approved' then raise exception 'This inspection can no longer be changed.'; end if;
  if p_size is null or p_size < 1 or p_size > v.qty_received then
    raise exception 'Sample size must be between 1 and the quantity received (%).', v.qty_received;
  end if;
  update public.inspections set sample_size = p_size, sample_override_reason = trim(p_reason) where id = p_id;
end $$;

create function public.set_inspection_stage(p_id bigint, p_stage public.sampling_stage) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_role('qa') then raise exception 'Only QA can change the inspection stage.' using errcode = '42501'; end if;
  update public.inspections set stage = p_stage where id = p_id and status in ('draft', 'returned');
  if not found then raise exception 'The stage can only change before the inspection is submitted.'; end if;
end $$;

revoke execute on function
  public.create_inspection, public.inspection_verdict, public.submit_inspection, public.return_inspection,
  public.approve_inspection, public.reopen_inspection, public.override_sample_size, public.set_inspection_stage
  from public, anon;
grant execute on function
  public.create_inspection, public.inspection_verdict, public.submit_inspection, public.return_inspection,
  public.approve_inspection, public.reopen_inspection, public.override_sample_size, public.set_inspection_stage
  to authenticated;
