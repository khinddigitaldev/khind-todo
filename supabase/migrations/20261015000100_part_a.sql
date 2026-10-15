-- Sub-project 1: Part A cover fields, quick check, KHIND lot decision, NCR -> MDR.
-- Spec: notes/Specs/2026-10-15-part-a-cover-design.md

-- New types -------------------------------------------------------------------
create type public.supplier_category as enum ('local', 'import', 'subcont');
create type public.lot_decision as enum ('accept', 'reject', 'others');
create type public.lot_action as enum ('accept', 'uai', 'online_rework', 'offline_rework', 'rts', 'scrap');
alter type public.inspection_type add value if not exists 'quick';

alter table public.suppliers add column category public.supplier_category;

-- Part A + decision columns -----------------------------------------------------
alter table public.inspections
  add column grn_no text check (grn_no is null or char_length(grn_no) <= 40),
  add column ref_no text check (ref_no is null or char_length(ref_no) <= 40),
  add column motor_part_no text check (motor_part_no is null or char_length(motor_part_no) <= 40),
  add column component_marking text check (component_marking is null or char_length(component_marking) <= 1000),
  add column quick boolean not null default false,
  add column quick_result public.check_result check (quick_result is distinct from 'na'),
  add column quick_qty int check (quick_qty is null or quick_qty >= 1),
  add column quick_remark text check (quick_remark is null or char_length(quick_remark) <= 500),
  add column lot_decision public.lot_decision,
  add column decision_other text,
  add column lot_action public.lot_action,
  add column accept_qty int check (accept_qty is null or accept_qty >= 0),
  add column reject_qty int check (reject_qty is null or reject_qty >= 0),
  add column raise_mdr boolean not null default false,
  add column uai_reason text;

-- Quick-check lots have no sample size and need no template.
alter table public.inspections alter column sample_size drop not null;
alter table public.inspections alter column template_version_id drop not null;

-- Convert old dispositions (demo data) ------------------------------------------
update public.inspections set
  lot_decision = case disposition when 'accept' then 'accept' when 'concession' then 'accept' else 'reject' end::public.lot_decision,
  lot_action = case disposition when 'accept' then 'accept' when 'concession' then 'uai'
                                when 'sort' then 'offline_rework' else 'rts' end::public.lot_action,
  accept_qty = case when disposition in ('accept', 'concession') then qty_received else 0 end,
  reject_qty = case when disposition in ('accept', 'concession') then 0 else qty_received end,
  uai_reason = concession_reason
where disposition is not null;

-- NCR -> MDR ----------------------------------------------------------------
alter table public.ncrs rename to mdrs;
alter table public.mdrs
  add column lot_decision public.lot_decision,
  add column lot_action public.lot_action;
update public.mdrs set
  lot_decision = case disposition when 'concession' then 'accept' else 'reject' end::public.lot_decision,
  lot_action = case disposition when 'concession' then 'uai' when 'sort' then 'offline_rework' when 'reject' then 'rts' else 'accept' end::public.lot_action,
  number = replace(number, 'NCR-', 'MDR-');
alter table public.mdrs alter column lot_decision set not null, alter column lot_action set not null;
insert into public.doc_counters (kind, year, last)
select 'MDR', year, last from public.doc_counters where kind = 'NCR'
on conflict (kind, year) do update set last = greatest(public.doc_counters.last, excluded.last);

-- Old approve function and columns go away ------------------------------------
drop function public.approve_inspection(bigint, public.disposition, text);
alter table public.mdrs drop column disposition;
alter table public.inspections drop column disposition, drop column concession_reason;
drop type public.disposition;

-- Who may write the new header fields (owner, while draft/returned; RLS from 0300).
grant update (grn_no, ref_no, motor_part_no, component_marking, quick_result, quick_qty, quick_remark)
  on public.inspections to authenticated;

-- Sample size: quick lots keep null ------------------------------------------
create or replace function public.inspections_resample() returns trigger
language plpgsql set search_path = '' as $$
declare
  t public.inspection_type;
begin
  if new.quick then
    return new;
  end if;
  if new.sample_override_reason is null
     and (new.qty_received is distinct from old.qty_received or new.stage is distinct from old.stage) then
    select inspection_type into t from public.parts where id = new.part_id;
    new.sample_size := public.sample_size_for(new.qty_received, new.stage, t);
  end if;
  return new;
end $$;

-- create_inspection: Part A fields + quick parts --------------------------------
drop function public.create_inspection(bigint, bigint, int, timestamptz, text, text, text);
create function public.create_inspection(
  p_supplier_id bigint, p_part_id bigint, p_qty int, p_received_at timestamptz default now(),
  p_po text default null, p_do text default null, p_lot text default null,
  p_grn text default null, p_ref text default null, p_motor text default null
) returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_part public.parts;
  v_version bigint;
  v_quick boolean;
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
  v_quick := v_part.inspection_type = 'quick';
  if not exists (select 1 from public.suppliers where id = p_supplier_id and active) then
    raise exception 'Supplier not found or inactive.';
  end if;
  if not v_quick then
    if v_part.template_id is null then
      raise exception 'Part % has no inspection template. Ask QA to assign one.', v_part.part_no;
    end if;
    select id into v_version from public.template_versions
    where template_id = v_part.template_id order by version desc limit 1;
    if v_version is null then raise exception 'The template for part % has no versions yet.', v_part.part_no; end if;
  end if;

  insert into public.inspections (number, supplier_id, part_id, template_version_id, po_no, do_no, lot_no,
                                  grn_no, ref_no, motor_part_no, qty_received, received_at, sample_size,
                                  quick, inspector_id)
  values (public.next_number('IQC'), p_supplier_id, p_part_id, v_version,
          nullif(trim(p_po), ''), nullif(trim(p_do), ''), nullif(trim(p_lot), ''),
          nullif(trim(p_grn), ''), nullif(trim(p_ref), ''), nullif(trim(p_motor), ''),
          p_qty, coalesce(p_received_at, now()),
          case when v_quick then null else public.sample_size_for(p_qty, 'normal', v_part.inspection_type) end,
          v_quick, auth.uid())
  returning id into v_id;

  if not v_quick then
    insert into public.inspection_defects (inspection_id, defect_class)
    select v_id, c from unnest(enum_range(null::public.defect_class)) c;
  end if;
  return v_id;
end $$;

-- Verdict: quick lots use the quick-check result ------------------------------
create or replace function public.inspection_verdict(p_id bigint) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when i.quick then case i.quick_result when 'ok' then 'accept' when 'ng' then 'reject' end
    else (select case
            when bool_or(d.found is null) then null
            when bool_or(d.found >= coalesce(d.re, a.re, 1)) then 'reject'
            else 'accept' end
          from public.inspection_defects d
          left join public.sampling_acceptance a on a.plan_source = 'KHIND' and a.defect_class = d.defect_class
          where d.inspection_id = i.id)
  end
  from public.inspections i where i.id = p_id
$$;

-- Submit: quick-check branch ----------------------------------------------------
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
    if v.quick_result is null then missing := missing || 'quick check result not entered'; end if;
    if v.quick_qty is null then
      missing := missing || 'quick check qty not entered';
    elsif v.quick_qty > v.qty_received then
      missing := missing || 'quick check qty must be between 1 and the lot quantity';
    end if;
    if v.quick_result = 'ng' and coalesce(trim(v.quick_remark), '') = '' then
      missing := missing || 'NG quick check needs a remark';
    end if;
  else
    select count(*) into n from public.template_items ti
    where ti.version_id = v.template_version_id
      and not exists (select 1 from public.inspection_checks c where c.inspection_id = p_id and c.item_id = ti.id);
    if n > 0 then missing := missing || format('%s checklist item(s) not answered', n); end if;

    select count(*) into n from public.inspection_checks c
    where c.inspection_id = p_id and c.result = 'ng' and coalesce(trim(c.comment), '') = '';
    if n > 0 then missing := missing || format('%s NG item(s) need a comment', n); end if;

    select count(*) into n from public.template_characteristics tc
    where tc.version_id = v.template_version_id
      and not exists (select 1 from public.inspection_measurements m
                      where m.inspection_id = p_id and m.characteristic_id = tc.id and cardinality(m.readings) >= 1);
    if n > 0 then missing := missing || format('%s dimension(s) have no readings', n); end if;

    select count(*) into n from public.inspection_measurements m
    where m.inspection_id = p_id and cardinality(m.readings) > v.sample_size;
    if n > 0 then missing := missing || format('%s dimension(s) have more readings than the sample size', n); end if;

    select count(*) into n from public.inspection_defects d where d.inspection_id = p_id and d.found is null;
    if n > 0 then missing := missing || format('%s defect count(s) not entered', n); end if;

    select count(*) into n from public.inspection_defects d where d.inspection_id = p_id and d.found > v.sample_size;
    if n > 0 then missing := missing || 'defects found cannot be more than the sample size'; end if;
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

-- Approve with the KHIND lot decision -------------------------------------------
create function public.approve_inspection(
  p_id bigint, p_decision public.lot_decision, p_action public.lot_action,
  p_accept_qty int, p_reject_qty int, p_other text default null, p_uai_reason text default null,
  p_raise_mdr boolean default false
) returns text language plpgsql security definer set search_path = '' as $$
declare
  v public.inspections;
  v_verdict text;
  v_summary text;
  v_mdr text;
  v_allowed public.lot_action[];
begin
  if not public.has_role('qa') then raise exception 'Only QA can approve.' using errcode = '42501'; end if;
  select * into v from public.inspections where id = p_id for update;
  if not found then raise exception 'Inspection not found.'; end if;
  if v.status <> 'submitted' then raise exception 'Only submitted inspections can be approved.'; end if;
  if v.inspector_id = auth.uid() then
    raise exception 'You cannot approve an inspection you performed.' using errcode = '42501';
  end if;
  if p_decision is null or p_action is null then raise exception 'Choose a lot decision and an action.'; end if;

  v_allowed := case p_decision
    when 'accept' then array['accept', 'uai']::public.lot_action[]
    when 'reject' then array['uai', 'online_rework', 'offline_rework', 'rts', 'scrap']::public.lot_action[]
    else enum_range(null::public.lot_action) end;
  if not (p_action = any (v_allowed)) then
    raise exception 'Action % is not allowed with decision %.', upper(p_action::text), upper(p_decision::text);
  end if;
  if p_decision = 'others' and coalesce(trim(p_other), '') = '' then
    raise exception 'Please describe the OTHERS decision.';
  end if;
  if p_accept_qty is null or p_reject_qty is null or p_accept_qty < 0 or p_reject_qty < 0
     or p_accept_qty + p_reject_qty <> v.qty_received then
    raise exception 'Accept qty + Reject qty must equal the quantity received (%).', v.qty_received;
  end if;
  v_verdict := public.inspection_verdict(p_id);
  if v_verdict = 'reject' and p_decision = 'accept' and p_action = 'accept' then
    raise exception 'The system verdict is Reject. Use UAI or another action.';
  end if;
  if p_action = 'uai' and coalesce(trim(p_uai_reason), '') = '' then
    raise exception 'UAI needs a reason.';
  end if;

  update public.inspections
  set status = 'approved', approver_id = auth.uid(), approved_at = now(), verdict = v_verdict, reopen_reason = null,
      lot_decision = p_decision, lot_action = p_action, accept_qty = p_accept_qty, reject_qty = p_reject_qty,
      decision_other = case when p_decision = 'others' then trim(p_other) end,
      uai_reason = case when p_action = 'uai' then trim(p_uai_reason) end,
      raise_mdr = coalesce(p_raise_mdr, false)
  where id = p_id;

  if p_decision = 'reject' or coalesce(p_raise_mdr, false) then
    if v.quick then
      v_summary := format('quick check: %s%s', upper(coalesce(v.quick_result::text, '-')),
                          coalesce(' - ' || nullif(trim(v.quick_remark), ''), ''));
    else
      select coalesce(string_agg(format('%s: %s found%s', d.defect_class, d.found,
                                        coalesce(' - ' || nullif(trim(d.description), ''), '')),
                                 '; ' order by d.defect_class), 'No defects counted')
      into v_summary
      from public.inspection_defects d where d.inspection_id = p_id and d.found > 0;
    end if;

    insert into public.mdrs (number, inspection_id, qty_affected, summary, lot_decision, lot_action)
    values (public.next_number('MDR'), p_id, case when p_reject_qty > 0 then p_reject_qty else v.qty_received end,
            v_summary, p_decision, p_action)
    on conflict (inspection_id) do update
      set lot_decision = excluded.lot_decision, lot_action = excluded.lot_action,
          summary = excluded.summary, qty_affected = excluded.qty_affected
    returning number into v_mdr;
  end if;
  return v_mdr;
end $$;

-- Reopen clears the decision as well ------------------------------------------
create or replace function public.reopen_inspection(p_id bigint, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_role('qa') then raise exception 'Only QA can reopen.' using errcode = '42501'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Please give a reason for reopening.'; end if;
  update public.inspections
  set status = 'submitted', reopen_reason = trim(p_reason), approver_id = null, approved_at = null,
      lot_decision = null, lot_action = null, accept_qty = null, reject_qty = null,
      decision_other = null, uai_reason = null, raise_mdr = false
  where id = p_id and status = 'approved';
  if not found then raise exception 'Only approved inspections can be reopened.'; end if;
end $$;

-- Override sample size: not for quick lots -------------------------------------
create or replace function public.override_sample_size(p_id bigint, p_size int, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v public.inspections;
begin
  if not public.has_role('qa') then raise exception 'Only QA can override the sample size.' using errcode = '42501'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Please give a reason for the override.'; end if;
  select * into v from public.inspections where id = p_id for update;
  if not found or v.status = 'approved' then raise exception 'This inspection can no longer be changed.'; end if;
  if v.quick then raise exception 'Quick-check lots have no sample size.'; end if;
  if p_size is null or p_size < 1 or p_size > v.qty_received then
    raise exception 'Sample size must be between 1 and the quantity received (%).', v.qty_received;
  end if;
  update public.inspections set sample_size = p_size, sample_override_reason = trim(p_reason) where id = p_id;
end $$;

revoke execute on function public.create_inspection, public.approve_inspection from public, anon;
grant execute on function public.create_inspection, public.approve_inspection to authenticated;
